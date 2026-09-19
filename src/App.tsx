import { useState } from 'react';
import { CameraView } from './features/camera/CameraView';
import { DigitalTwinPage } from './features/digitalTwin/DigitalTwinPage';
import { usePipelineStore } from './store/pipelineStore';
import axios from 'axios';

function App() {
  const { stage, setStage, setDetectedObjects, setError } = usePipelineStore();
  const [isDetecting, setIsDetecting] = useState(false);
  const [view, setView] = useState<'scan' | 'twin'>('scan');

  const handleDetect = async (blob: Blob) => {
    if (isDetecting) return;
    setIsDetecting(true);
    setStage('detecting');

    const formData = new FormData();
    formData.append('image', blob, 'frame.jpg');
    formData.append('prompts', 'shirt, shoes, bag, watch, glasses, pants, jacket');

    try {
      const response = await axios.post('http://localhost:8000/api/pipeline/detect', formData);
      setDetectedObjects(response.data.detections);
      setStage('selecting');
    } catch (err: any) {
      setError('Detection failed: ' + err.message);
      setStage('error');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleObjectSelected = async (points: { x: number; y: number }[]) => {
    console.log('Object selected with points:', points);

    setStage('segmenting');

    try {
      // 1. Trigger the Lock on the backend
      const formData = new FormData();
      formData.append('label', 'shirt'); // Simplified: should be matched box label
      formData.append('image', new Blob([], { type: 'image/jpeg' })); // Simplified: should be actual frame

      const response = await axios.post('http://localhost:8000/api/pipeline/lock', formData);

      if (response.data.status === 'retrieved') {
        setView('twin');
      } else if (response.data.status === 'generating') {
        setStage('generating');
        setTimeout(() => {
          setView('twin');
        }, 1000);
      }
    } catch (err: any) {
      console.error('Lock error:', err);
      setStage('error');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-4 py-3 md:px-6 md:py-4 flex justify-between items-center bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-zcanner-navy rounded-lg flex items-center justify-center text-white font-bold text-sm">Z</div>
          <h1 className="text-base md:text-xl font-bold text-zcanner-navy tracking-tight truncate">ZcannerReality</h1>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-500">
          <a href="#" className="text-zcanner-navy">Fashion Twin</a>
          <a href="#" className="hover:text-zcanner-navy transition-colors">Object-to-AR</a>
          <a href="#" className="hover:text-zcanner-navy transition-colors">Image-to-AR</a>
          <a href="#" className="hover:text-zcanner-navy transition-colors">Gallery</a>
        </nav>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 py-3 md:px-8 md:py-6">
        <div className="relative w-full h-[calc(100dvh-120px)] min-h-[420px] max-h-[760px]">
          {view === 'scan' ? (
            <>
              <CameraView
                onFrameCapture={handleDetect}
                onObjectSelected={handleObjectSelected}
              />

              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
                <div className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[11px] md:text-sm font-medium backdrop-blur-md border transition-all ${
                  stage === 'detecting' ? 'bg-blue-500/20 text-blue-600 border-blue-200' :
                  stage === 'selecting' ? 'bg-green-500/20 text-green-600 border-green-200' :
                  stage === 'segmenting' ? 'bg-purple-500/20 text-purple-600 border-purple-200' :
                  stage === 'generating' ? 'bg-orange-500/20 text-orange-600 border-orange-200' :
                  stage === 'complete' ? 'bg-teal-500/20 text-teal-600 border-teal-200' :
                  'bg-gray-500/20 text-gray-600 border-gray-200'
                }`}>
                  {stage === 'idle' && 'Ready to Scan'}
                  {stage === 'detecting' && '🔍 Detecting Objects...'}
                  {stage === 'selecting' && '✍️ Circle the object you want'}
                  {stage === 'segmenting' && '🎯 Segmenting Object...'}
                  {stage === 'generating' && '🧊 Generating Digital Twin...'}
                  {stage === 'complete' && '✅ Twin Ready!'}
                  {stage === 'error' && '❌ Error Occurred'}
                </div>

                <div className="flex gap-2">
                  {usePipelineStore.getState().detectedObjects.map((obj, i) => (
                    <span key={i} className="px-2 py-1 bg-white/80 backdrop-blur-sm text-[10px] rounded border border-zcanner-sea/30 text-zcanner-navy font-semibold">
                      {obj.label}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <DigitalTwinPage onBack={() => setView('scan')} />
          )}
        </div>
      </main>

      <footer className="p-3 text-center text-[10px] md:text-xs text-gray-400">
        &copy; 2026 ZcannerReality. Scan. Create. Try. Experience.
      </footer>
    </div>
  );
}

export default App;
