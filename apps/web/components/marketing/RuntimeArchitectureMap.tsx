"use client";

import { useEffect, useRef } from "react";

export function RuntimeArchitectureMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const particles: { x: number, y: number, vx: number, vy: number, life: number }[] = [];
    
    // Create initial nodes for the "Architecture Graph"
    const nodes = [
      { x: width * 0.2, y: height * 0.5 }, // Identity Provider
      { x: width * 0.5, y: height * 0.3 }, // Policy Engine
      { x: width * 0.5, y: height * 0.7 }, // Risk Explorer
      { x: width * 0.8, y: height * 0.5 }, // Production Environment
    ];

    let animationId: number;

    function render() {
      if (!ctx || !canvas) return;
      
      // Semi-transparent clear for trailing effect
      ctx.fillStyle = "rgba(12, 14, 18, 0.2)";
      ctx.fillRect(0, 0, width, height);

      // Draw Nodes
      ctx.fillStyle = "#3f8cff";
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#62a0ff";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Lines
      ctx.strokeStyle = "rgba(63, 140, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      ctx.lineTo(nodes[1].x, nodes[1].y);
      ctx.lineTo(nodes[3].x, nodes[3].y);
      ctx.moveTo(nodes[0].x, nodes[0].y);
      ctx.lineTo(nodes[2].x, nodes[2].y);
      ctx.lineTo(nodes[3].x, nodes[3].y);
      ctx.stroke();

      // Particles (Simulated Runtime Data Flow)
      if (Math.random() > 0.5) {
        particles.push({
          x: nodes[0].x,
          y: nodes[0].y,
          vx: (nodes[1].x - nodes[0].x) * 0.01 + (Math.random() - 0.5),
          vy: (nodes[1].y - nodes[0].y) * 0.01 + (Math.random() - 0.5),
          life: 1.0
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.01;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = `rgba(98, 160, 255, ${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    }

    render();

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-12">
      <div className="flex-1 w-full">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          Architecture
        </h2>
        <h3 className="text-4xl font-medium text-white mb-6 leading-tight">
          Six analyses, one merge verdict
        </h3>
        <p className="text-[color:var(--dg-fg-muted)] mb-8">
          When a pull request opens, DriftGuard parses the Terraform or OpenTofu plan and runs its
          analyses in parallel — cost, security, drift, and compliance — recalls related past
          incidents from semantic memory, evaluates your policy, and posts a single allow / warn /
          block result as a GitHub Check.
        </p>
        <ul className="space-y-4 font-mono text-[11px] text-[color:var(--dg-fg-subtle)] uppercase tracking-widest">
          <li className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[color:var(--dg-electric)] rounded-full"></span>
            Parallel analysis engines
          </li>
          <li className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[color:var(--dg-electric)] rounded-full"></span>
            Semantic incident recall
          </li>
          <li className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[color:var(--dg-electric)] rounded-full"></span>
            Deterministic policy gating
          </li>
        </ul>
      </div>

      <div className="flex-1 w-full h-[500px] border border-[color:var(--dg-border-strong)] rounded-lg bg-[color:var(--dg-surface)] relative overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full mix-blend-screen" />
        
        {/* Terminal Overlay */}
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur border border-[color:var(--dg-border)] rounded px-3 py-2 font-mono text-[10px] text-[color:var(--dg-electric-bright)] uppercase tracking-widest">
          [ plan → analyses → policy → check ]
        </div>
      </div>
    </div>
  );
}
