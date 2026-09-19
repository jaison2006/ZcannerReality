import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { Loader } from '@react-three/drei';

interface ModelProps {
  url: string;
}

function Model({ url }: ModelProps) {
  // Use GLTF loader from Drei
  const { scene } = useGLTF(url);

  // Clone scene to avoid issues if multiple instances exist
  return <primitive object={scene.clone()} scale={1.5} position={[0, 0, 0]} />;
}

export const TwinViewer: React.FC<{ modelUrl: string; autoRotate?: boolean }> = ({ modelUrl, autoRotate = false }) => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-50 to-gray-200 rounded-2xl overflow-hidden relative">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
        <Environment preset="city" />

        <Suspense fallback={null}>
          <Stage
            intensity={0.5}
            environment="city"
            shadows="contact"
            adjustCamera={true}
          >
            <Model url={modelUrl} />
          </Stage>
          <ContactShadows
            position={[0, -0.8, 0]}
            opacity={0.4}
            scale={10}
            blur={2}
            far={10}
            resolution={256}
            color="#000000"
          />
        </Suspense>

        <OrbitControls
          enablePan={false}
          makeDefault
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          minDistance={2}
          maxDistance={10}
        />
      </Canvas>

      <div className="absolute bottom-4 left-4 flex gap-2">
        <div className="px-3 py-1 bg-white/80 backdrop-blur-md text-[10px] rounded-full border border-gray-200 text-gray-600 font-medium">
          GLB Model View
        </div>
      </div>
    </div>
  );
};
