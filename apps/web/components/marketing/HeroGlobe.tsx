"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

// Helper to generate points on a sphere for the globe backdrop.
function generateGlobePoints(count: number, radius: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    positions[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
    positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  return positions;
}

function GlobePoints({ activeRef }: { activeRef: React.RefObject<boolean> }) {
  const ref = useRef<THREE.Points>(null);
  // Fewer points than the original 3000 — visually identical as a diffuse
  // backdrop, cheaper to render on mid-range GPUs.
  const [positions] = useState(() => generateGlobePoints(2000, 2.5));

  useFrame((state, delta) => {
    if (!activeRef.current || !ref.current) return; // paused while offscreen
    ref.current.rotation.y += delta * 0.1;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#3f8cff"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.4}
      />
    </Points>
  );
}

/**
 * Decorative 3D starfield behind the hero. Loaded via `next/dynamic` with
 * `ssr: false` from HeroMissionControl so its JS (three.js + fiber + drei)
 * is code-split out of the main bundle and only fetched on devices that
 * will actually render it (desktop/tablet, motion not reduced — see the
 * gating logic in HeroMissionControl).
 *
 * Rotation pauses via IntersectionObserver once the hero scrolls out of
 * view, so the WebGL render loop doesn't keep spending CPU/battery during
 * the rest of the page's scroll.
 */
export default function HeroGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        activeRef.current = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0 opacity-40 mix-blend-screen"
      aria-hidden="true"
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} dpr={[1, 1.5]}>
        <GlobePoints activeRef={activeRef} />
      </Canvas>
    </div>
  );
}
