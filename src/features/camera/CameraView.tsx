import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { LassoCanvas } from '../../components/interaction/LassoCanvas';
import { renderRLEMask } from '../../utils/rleDecoder';

interface CameraViewProps {
  onFrameCapture?: (blob: Blob) => void;
  onObjectSelected: (points: { x: number; y: number }[]) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ onFrameCapture, onObjectSelected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraModeRef = useRef<'user' | 'environment'>('environment');
  const captureStartedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'tracking' | 'lost' | 'error'>('idle');

  const startCamera = async (facingMode: 'user' | 'environment' = 'environment') => {
    setError(null);
    try {
      const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isSecureContext) {
        setError('Camera access requires a secure origin. Please open this page on localhost or use HTTPS.');
        return;
      }

      const mediaDevices = navigator.mediaDevices as MediaDevices | undefined;
      const getUserMediaFn = mediaDevices?.getUserMedia ?? (navigator as any).webkitGetUserMedia;

      if (!getUserMediaFn) {
        setError('This browser does not support camera access.');
        return;
      }

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      };

      const newStream = await getUserMediaFn.call(mediaDevices ?? navigator, constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          const nextDimensions = {
            width: videoRef.current?.videoWidth || 0,
            height: videoRef.current?.videoHeight || 0,
          };
          setDimensions(nextDimensions);

          if (!captureStartedRef.current && onFrameCapture) {
            captureStartedRef.current = true;
            setTimeout(() => {
              if (videoRef.current) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = nextDimensions.width || 640;
                tempCanvas.height = nextDimensions.height || 480;
                const ctx = tempCanvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(videoRef.current!, 0, 0, tempCanvas.width, tempCanvas.height);
                  tempCanvas.toBlob((blob) => blob && onFrameCapture!(blob), 'image/jpeg', 0.92);
                }
              }
            }, 600);
          }
        };
      }
    } catch (err: any) {
      console.error("Camera Error Details:", err);
      const errorName = err?.name || "UnknownError";
      const errorMessage = err?.message || "Camera unavailable or permission denied.";
      setError(`Camera Error: ${errorName} - ${errorMessage}`);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const initWebSocket = () => {
    const ws = new WebSocket('ws://localhost:8000/ws/segmentation');
    ws.onopen = () => {
      console.log('Connected to SAM 2 WebSocket');
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Update tracking status from server
      if (data.status === 'tracking') {
        setTrackingStatus('tracking');
      } else if (data.status === 'tracking_lost') {
        setTrackingStatus('lost');
      } else if (data.status === 'error') {
        setTrackingStatus('error');
      }

      if (data.message && data.status === 'error') {
        console.error("SAM 2 WebSocket Error:", data.message);
        // Temporarily expose actual error to UI for debugging
        setError(`AI Error: ${data.message}`);
      }

      if (data.mask && maskCanvasRef.current) {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
          if (data.mask.startsWith('http')) {
            // Handle mask as image URL (new SAM 2 GPU worker format)
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = data.mask;
            img.onload = () => {
              if (maskCanvasRef.current) {
                ctx.drawImage(img, 0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
              }
            };
          } else {
            // Fallback to RLE decoder for legacy/local workers
            renderRLEMask(ctx, data.mask, maskCanvasRef.current.width, maskCanvasRef.current.height);
          }
        }
      }
    };
    wsRef.current = ws;
  };

  const handleLassoComplete = (points: { x: number; y: number }[]) => {
    // 1. Init WebSocket for real-time feedback
    if (!wsRef.current) initWebSocket();

    // 2. Send points to SAM 2
    const sendPoints = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const imageB64 = captureCurrentFrame();
        if (imageB64) {
          wsRef.current.send(JSON.stringify({
            points: points,
            image: imageB64
          }));
        }
      }
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendPoints();
    } else {
      // Wait for connection if just initialized
      wsRef.current?.addEventListener('open', sendPoints, { once: true });
    }

    // 3. Trigger the Lock
    onObjectSelected(points);
  };

  // New: Handle tracking frames in a loop once locked
  useEffect(() => {
    let trackingInterval: ReturnType<typeof setInterval>;

    if (isLocked && trackingStatus === 'tracking' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      trackingInterval = setInterval(() => {
        const frameB64 = captureCurrentFrame();
        if (frameB64) {
          wsRef.current?.send(JSON.stringify({
            frame: frameB64
          }));
        }
      }, 100); // 10 FPS tracking
    }

    return () => clearInterval(trackingInterval);
  }, [isLocked, trackingStatus]);




  const captureCurrentFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg');
  };

  const toggleCamera = () => {
    const nextMode = cameraModeRef.current === 'environment' ? 'user' : 'environment';
    cameraModeRef.current = nextMode;
    startCamera(nextMode);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-2xl shadow-2xl border border-white/10">
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-lg font-medium mb-2 max-w-md">{error}</p>
          <button
            onClick={() => startCamera()}
            className="mt-4 px-5 py-2.5 bg-zcanner-sea text-white rounded-lg hover:bg-zcanner-navy transition-colors font-medium"
          >
            Allow Camera Access
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />

          {dimensions.width > 0 && (
            <LassoCanvas
              width={dimensions.width}
              height={dimensions.height}
              onSelectionComplete={handleLassoComplete}
            />
          )}

          {/* Real-time Mask Overlay */}
          <canvas
            ref={maskCanvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={toggleCamera}
              className="p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-all"
              title="Switch Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
            <div className="px-4 py-2 bg-black/40 backdrop-blur-sm text-white text-sm rounded-full border border-white/20">
              {isLocked ? '● OBJECT LOCKED' : 'Circle an object to select it'}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
