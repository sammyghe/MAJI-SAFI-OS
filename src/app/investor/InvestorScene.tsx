"use client";

import { useRef, useMemo, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { 
  Float, 
  Text, 
  MeshTransmissionMaterial, 
  Environment, 
  ContactShadows, 
  OrbitControls,
  PerspectiveCamera
} from "@react-three/drei";
import * as THREE from "three";

// ── Components ────────────────────────────────────────────────────────

function Rain() {
  const count = 100;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 15;
      const y = Math.random() * 15;
      const z = (Math.random() - 0.5) * 10;
      temp.push({ x, y, z, speed: 0.1 + Math.random() * 0.2 });
    }
    return temp;
  }, []);

  useFrame(() => {
    particles.forEach((p, i) => {
      p.y -= p.speed;
      if (p.y < -5) p.y = 15;
      const matrix = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z);
      meshRef.current.setMatrixAt(i, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.02, 0.6, 0.02]} />
      <meshBasicMaterial color="#C1E8FF" transparent opacity={0.3} />
    </instancedMesh>
  );
}

function GlassPanel({ position, title, value }: { position: [number, number, number], title: string, value: string }) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5} position={position}>
      <mesh 
        onPointerOver={() => setHovered(true)} 
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[2.2, 3, 0.1]} />
        <MeshTransmissionMaterial
          backside
          samples={4}
          thickness={0.3}
          chromaticAberration={0.03}
          anisotropy={0.1}
          distortion={0.1}
          distortionScale={0.1}
          temporalDistortion={0.1}
          iridescence={1}
          iridescenceIOR={1}
          iridescenceThicknessRange={[0, 1400]}
          color={hovered ? "#3b82f6" : "#ffffff"}
        />
      </mesh>
      
      <Text
        position={[0, 0.7, 0.11]}
        fontSize={0.12}
        color="#5483B3"
        anchorX="center"
        anchorY="middle"
        maxWidth={2}
      >
        {title}
      </Text>
      
      <Text
        position={[0, 0, 0.11]}
        fontSize={0.35}
        color="#C1E8FF"
        anchorX="center"
        anchorY="middle"
        maxWidth={2}
      >
        {value}
      </Text>
    </Float>
  );
}

function WaterDroplet() {
  const groupRef = useRef<THREE.Group>(null!);
  
  useFrame((state) => {
    groupRef.current.rotation.y += 0.01;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2 + 0.5;
  });

  return (
    <group ref={groupRef} position={[0, 0, -3]}>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.4, 0.8, 32]} />
        <meshPhysicalMaterial color="#C1E8FF" transmission={1} thickness={1} roughness={0} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshPhysicalMaterial color="#C1E8FF" transmission={1} thickness={1} roughness={0} />
      </mesh>
      <pointLight color="#C1E8FF" intensity={10} distance={5} />
    </group>
  );
}

// ── Main Scene ────────────────────────────────────────────────────────

export default function InvestorScene({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="w-full h-full bg-[#051937] cursor-pointer" onClick={onEnter}>
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center text-brand-sky animate-pulse font-black uppercase tracking-widest text-xs">
          Initialising Holographic Buffer...
        </div>
      }>
        <Canvas shadows camera={{ position: [0, 2, 12], fov: 35 }}>
          <color attach="background" args={["#051937"]} />
          <fog attach="fog" args={["#051937", 5, 25]} />

          <ambientLight intensity={0.8} />
          <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={10} castShadow />
          <pointLight position={[-10, 0, -5]} color="#3b82f6" intensity={5} />
          
          <Environment preset="night" />

          {/* Infinity Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#021024" roughness={0.05} metalness={0.9} />
          </mesh>
          
          <ContactShadows 
            opacity={0.4} 
            scale={20} 
            blur={2} 
            far={10} 
            color="#3b82f6" 
            position={[0, -2.9, 0]} 
          />

          <Rain />
          <WaterDroplet />

          <group position={[0, 0, 0]}>
            <GlassPanel position={[-4, 1, 0]} title="VOLUME OUTPUT" value="490 JARS" />
            <GlassPanel position={[0, 2.5, -2]} title="KPI REVENUE" value="14.7M UGX" />
            <GlassPanel position={[4, 1, 0]} title="PHASE STREAK" value="7 DAYS" />
          </group>

          <Text
            position={[0, -2, 2]}
            fontSize={0.15}
            color="#5483B3"
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.5}
          >
            VERIFY CREDENTIALS & ENTER COMMAND CENTER
          </Text>

          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            maxPolarAngle={Math.PI / 1.8} 
            minPolarAngle={Math.PI / 2.5} 
          />
        </Canvas>
      </Suspense>
    </div>
  );
}

