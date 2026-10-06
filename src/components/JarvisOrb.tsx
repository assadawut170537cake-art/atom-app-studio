import React, { useEffect, useRef } from 'react';
import { VoiceEmotion } from '../utils/audio';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type CorePersona = 'atom' | 'friday' | 'ultron';

interface AtomOrbProps {
  state: OrbState;
  emotion?: VoiceEmotion;
  persona?: CorePersona;
  onClick?: () => void;
  size?: number;
  className?: string;
  interactive?: boolean;
}

export const AtomOrb: React.FC<AtomOrbProps> = ({
  state = 'idle',
  emotion = 'neutral',
  persona = 'atom',
  onClick,
  size = 110,
  className = '',
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina display scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const radius = size * 0.38;

    // Particles for 3D sphere illusion
    const numPoints = 85;
    const points: { phi: number; theta: number; baseR: number; speed: number; phase: number }[] = [];
    for (let i = 0; i < numPoints; i++) {
      points.push({
        phi: Math.acos(-1 + (2 * i) / numPoints),
        theta: Math.sqrt(numPoints * Math.PI) * i,
        baseR: radius * (0.85 + Math.random() * 0.25),
        speed: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      time += 0.035;
      let rotSpeed = 0.012;
      let pulseAmp = 0.06;
      let waveFreq = 3;

      // Determine color palette based on persona, emotion and active state
      let glowColor = 'rgba(6, 182, 212, '; // cyan default for ATOM
      let particleColor = 'rgba(165, 243, 252, ';

      if (persona === 'friday') {
        glowColor = 'rgba(16, 185, 129, '; // emerald green for FRIDAY
        particleColor = 'rgba(167, 243, 208, ';
      } else if (persona === 'ultron') {
        glowColor = 'rgba(239, 68, 68, '; // crimson flame red for ULTRON
        particleColor = 'rgba(254, 202, 202, ';
      }

      if (emotion === 'happy') {
        if (persona === 'ultron') {
          glowColor = 'rgba(249, 115, 22, '; // fiery orange
          particleColor = 'rgba(254, 215, 170, ';
        } else {
          glowColor = 'rgba(16, 185, 129, '; // emerald/green
          particleColor = 'rgba(253, 224, 71, '; // golden sparkle
        }
        pulseAmp = 0.12;
      } else if (emotion === 'serious') {
        if (persona === 'friday') {
          glowColor = 'rgba(5, 150, 105, ';
          particleColor = 'rgba(209, 250, 229, ';
        } else {
          glowColor = 'rgba(139, 92, 246, '; // deep purple/violet
          particleColor = 'rgba(224, 231, 255, ';
        }
        pulseAmp = 0.04;
      } else if (emotion === 'alert') {
        glowColor = 'rgba(239, 68, 68, '; // crimson red/orange
        particleColor = 'rgba(254, 215, 170, ';
        pulseAmp = 0.16;
      }

      if (state === 'listening') {
        rotSpeed = 0.035;
        pulseAmp = Math.max(pulseAmp, 0.18);
        waveFreq = 8;
        glowColor = 'rgba(14, 165, 233, ';
        particleColor = 'rgba(224, 242, 254, ';
      } else if (state === 'thinking') {
        rotSpeed = 0.065;
        pulseAmp = 0.14;
        waveFreq = 12;
        glowColor = 'rgba(168, 85, 247, ';
        particleColor = 'rgba(233, 213, 255, ';
      } else if (state === 'speaking') {
        rotSpeed = 0.025;
        pulseAmp = Math.max(pulseAmp, 0.28);
        waveFreq = 6;
      }

      const pulse = 1 + Math.sin(time * 2.5) * pulseAmp;

      // Outer ambient holographic glow
      const grad = ctx.createRadialGradient(center, center, 4, center, center, radius * 1.35 * pulse);
      grad.addColorStop(0, glowColor + '0.45)');
      grad.addColorStop(0.5, glowColor + '0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(center, center, radius * 1.35 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Outer HUD rings
      ctx.save();
      ctx.translate(center, center);

      // Ring 1 (Dashed rotating)
      ctx.rotate(time * rotSpeed * 0.8);
      ctx.strokeStyle = glowColor + '0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.08 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Ring 2 (Arc segments)
      ctx.rotate(-time * rotSpeed * 1.4);
      ctx.setLineDash([16, 12, 4, 8]);
      ctx.strokeStyle = glowColor + (state === 'speaking' || state === 'listening' ? '0.7)' : '0.3)');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.18 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      // 3D Rotating particle sphere
      const rotY = time * rotSpeed;
      const rotX = Math.sin(time * 0.5) * 0.35;

      // Sort points by Z to draw back-to-front
      const projectedPoints = points.map((p) => {
        const r = p.baseR * pulse + Math.sin(time * waveFreq + p.phase) * (radius * 0.08);

        // Spherical to Cartesian
        let x = r * Math.sin(p.phi) * Math.cos(p.theta + rotY);
        let y = r * Math.sin(p.phi) * Math.sin(p.theta + rotY);
        let z = r * Math.cos(p.phi);

        // Rotate on X axis
        const yRot = y * Math.cos(rotX) - z * Math.sin(rotX);
        const zRot = y * Math.sin(rotX) + z * Math.cos(rotX);

        return {
          x: center + x,
          y: center + yRot,
          z: zRot,
          alpha: Math.max(0.15, (zRot + radius) / (radius * 2)),
          scale: Math.max(0.6, (zRot + radius * 1.2) / (radius * 2)),
        };
      });

      projectedPoints.sort((a, b) => a.z - b.z);

      // Draw particle connections (neural mesh)
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projectedPoints.length; i++) {
        const p1 = projectedPoints[i];
        if (p1.z < 0) continue;
        for (let j = i + 1; j < Math.min(i + 5, projectedPoints.length); j++) {
          const p2 = projectedPoints[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < radius * 0.45) {
            ctx.strokeStyle = glowColor + `${(1 - dist / (radius * 0.45)) * 0.25})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of projectedPoints) {
        const dotRadius = Math.max(0.8, 1.8 * p.scale);
        ctx.fillStyle = particleColor + `${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // Extra bright flare on front particles
        if (p.z > radius * 0.5) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotRadius * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Center bright core
      const coreGrad = ctx.createRadialGradient(center, center, 1, center, center, radius * 0.35);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, glowColor + '0.9)');
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(center, center, radius * 0.35 * pulse, 0, Math.PI * 2);
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, emotion, size]);

  return (
    <div
      onClick={interactive ? onClick : undefined}
      className={`relative inline-flex items-center justify-center transition-transform ${
        interactive ? 'cursor-pointer active:scale-95 hover:opacity-95' : ''
      } ${className}`}
      style={{ width: size, height: size }}
      title={
        interactive
          ? state === 'listening'
            ? 'กำลังฟังเสียงบอส (คลิกเพื่อหยุด)'
            : 'คลิกเพื่อพูดคุยกับ ATOM'
          : undefined
      }
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]"
      />
      {/* Ripple ring for active states */}
      {(state === 'listening' || state === 'speaking') && (
        <div
          className={`absolute inset-0 rounded-full border animate-ping pointer-events-none ${
            emotion === 'alert'
              ? 'border-red-400/50'
              : emotion === 'happy'
              ? 'border-emerald-400/50'
              : emotion === 'serious'
              ? 'border-purple-400/50'
              : 'border-cyan-400/40'
          }`}
          style={{ animationDuration: state === 'listening' ? '1.4s' : '1.8s' }}
        />
      )}
    </div>
  );
};

// Export alias for backward compatibility
export const JarvisOrb = AtomOrb;
