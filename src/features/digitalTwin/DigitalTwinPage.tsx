import React, { useState, useEffect } from 'react';
import { TwinViewer } from '../../components/ar/TwinViewer';
import { usePipelineStore } from '../../store/pipelineStore';
import axios from 'axios';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

interface DigitalTwinPageProps {
  onBack: () => void;
}

export const DigitalTwinPage: React.FC<DigitalTwinPageProps> = ({ onBack }) => {
  const { setDigitalTwin } = usePipelineStore();
  const [status, setStatus] = useState<'loading' | 'processing' | 'ready' | 'error'>('loading');
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pollForTwin = async () => {
      try {
        // In a real app, we'd use the sessionId from usePipelineStore
        const response = await axios.get('http://localhost:8000/api/pipeline/twin/status');
        const data = response.data;

        if (data.status === 'ready') {
          setStatus('ready');
          setModelUrl(data.modelUrl);
        } else if (data.status === 'processing') {
          setStatus('processing');
          setProgress(data.progress || 0);
        } else {
          setError('Unexpected response from server');
          setStatus('error');
        }
      } catch (err: any) {
        setError('Failed to retrieve digital twin: ' + err.message);
        setStatus('error');
      }
    };

    pollForTwin();
    const interval = setInterval(pollForTwin, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 flex justify-between items-center border-b border-gray-100">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-zcanner-navy">Your Digital Twin</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 relative bg-gray-50">
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-10 h-10 text-zcanner-sea animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Preparing Digital Twin...</p>
          </div>
        )}

        {status === 'processing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-xs mb-6">
              <div className="flex justify-between text-xs mb-2 text-gray-500 font-medium">
                <span>AI Reconstruction</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zcanner-sea transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <p className="text-gray-600 font-medium">AI is reconstructing your object...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-600 font-medium mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-zcanner-navy text-white rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {status === 'ready' && modelUrl && (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1">
              <TwinViewer modelUrl={modelUrl} />
            </div>
            <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-bold text-zcanner-navy">Digital Twin Ready</p>
                  <p className="text-xs text-gray-500">High-fidelity GLB generated</p>
                </div>
              </div>
              <button className="px-6 py-2 bg-zcanner-sea text-white rounded-full text-sm font-bold hover:bg-zcanner-navy transition-colors">
                Try On in AR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
