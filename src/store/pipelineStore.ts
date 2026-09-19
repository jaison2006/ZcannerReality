import { create } from 'zustand';

export type PipelineStage = 'idle' | 'detecting' | 'selecting' | 'segmenting' | 'generating' | 'complete' | 'error';

interface PipelineState {
  stage: PipelineStage;
  sessionId: string | null;
  detectedObjects: any[];
  selectedObject: any | null;
  digitalTwin: any | null;
  error: string | null;

  setStage: (stage: PipelineStage) => void;
  setSessionId: (id: string | null) => void;
  setDetectedObjects: (objects: any[]) => void;
  setSelectedObject: (obj: any | null) => void;
  setDigitalTwin: (twin: any | null) => void;
  setError: (err: string | null) => void;
  reset: () => void;
}

export const usePipelineStore = create<PipelineState>((set) => ({
  stage: 'idle',
  sessionId: null,
  detectedObjects: [],
  selectedObject: null,
  digitalTwin: null,
  error: null,

  setStage: (stage) => set({ stage }),
  setSessionId: (sessionId) => set({ sessionId }),
  setDetectedObjects: (detectedObjects) => set({ detectedObjects }),
  setSelectedObject: (selectedObject) => set({ selectedObject }),
  setDigitalTwin: (digitalTwin) => set({ digitalTwin }),
  setError: (error) => set({ error }),
  reset: () => set({
    stage: 'idle',
    sessionId: null,
    detectedObjects: [],
    selectedObject: null,
    digitalTwin: null,
    error: null,
  }),
}));
