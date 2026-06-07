import { useEffect, useRef } from "react";

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

export default function ConfettiCanvas({ active, onComplete }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const activeRef = useRef<boolean>(active);

  useEffect(() => {
    activeRef.current = active;
    if (active) {
      initConfetti();
    }
  }, [active]);

  const initConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset list
    const colors = [
      "#FF5733",
      "#FFC300",
      "#28B463",
      "#2E86C1",
      "#8E44AD",
      "#E74C3C",
      "#3498DB",
      "#1ABC9C",
      "#E67E22",
      "#EC4899",
    ];
    const particles: Particle[] = [];

    // Create 150 particles bursting from center-bottom or scattered
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
        y: window.innerHeight / 2 + (Math.random() - 0.5) * 50,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 12,
        speedY: -Math.random() * 14 - 4, // Upwards force
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
      });
    }

    particlesRef.current = particles;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      if (particles.length === 0 && !activeRef.current) {
        if (onComplete) onComplete();
        return;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Draw particle
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        // Draw rectangle
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();

        // Update physics
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.3; // Gravity
        p.speedX *= 0.98; // Air drag
        p.rotation += p.rotationSpeed;

        // Fade away or exit screen
        if (p.y > canvas.height + 20) {
          particles.splice(i, 1);
        } else {
          // Fade progressively
          p.opacity -= 0.008;
          if (p.opacity <= 0) {
            particles.splice(i, 1);
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [onComplete]);

  return (
    <canvas
      id="confetti-canvas"
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
