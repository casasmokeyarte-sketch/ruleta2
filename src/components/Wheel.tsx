import { useEffect, useRef, useState } from "react";
import { WheelOption, WheelConfig } from "../types";
import { sounds } from "../utils";
import prideFlamingo from "../assets/images/pride_flamingo_1780378704946.png";
import { Play } from "lucide-react";

interface WheelProps {
  options: WheelOption[];
  config: WheelConfig;
  onSpinStart: () => void;
  onSpinComplete: (winningOption: WheelOption) => void;
  isSpinning: boolean;
}

export default function Wheel({
  options,
  config,
  onSpinStart,
  onSpinComplete,
  isSpinning,
}: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Track continuous rotation so we don't snap back to 0 between spins
  const currentRotationRef = useRef<number>(0);
  const [indicatorActive, setIndicatorActive] = useState<boolean>(false);
  const [canvasSize, setCanvasSize] = useState<number>(450);

  const activeOptions = options.filter((o) => o.enabled);

  // Sound enabled config watcher
  useEffect(() => {
    sounds.setEnabled(config.soundEnabled);
  }, [config.soundEnabled]);

  // Handle Resize beautifully and dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const size = Math.min(width, height, 520);
        setCanvasSize(size > 280 ? size : 280);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Redraw whenever configuration, options, or local canvas size changes
  useEffect(() => {
    drawWheel(currentRotationRef.current);
  }, [activeOptions, canvasSize]);

  // Formulates drawing
  const drawWheel = (rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // Set display size and buffer size for pixel ratio crispness
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    ctx.scale(dpr, dpr);

    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    const outerRadius = (canvasSize / 2) - 12;
    const innerRadius = 40; // central pin

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // If no active options, draw elegant placeholder
    if (activeOptions.length === 0) {
      // Draw outer circle border
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#1E293B";
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#475569";
      ctx.stroke();

      // Placeholder text
      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 16px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Sin opciones activas", cx, cy);
      return;
    }

    const arcSize = (Math.PI * 2) / activeOptions.length;

    // Draw slices
    activeOptions.forEach((option, i) => {
      const startAngle = i * arcSize + rotation;
      const endAngle = (i + 1) * arcSize + rotation;

      // Slice background
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = option.color;
      ctx.fill();

      // Add a clean dividing border line
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.stroke();

      // Text inside slice
      ctx.save();
      ctx.translate(cx, cy);
      // Align text rotation along slice bisector
      const midAngle = startAngle + arcSize / 2;
      ctx.rotate(midAngle);

      // Contrast checker for text color
      const isColorWhitePreferable = isColorLight(option.color);
      ctx.fillStyle = isColorWhitePreferable ? "#0F172A" : "#FFFFFF";
      
      // Responsive Font sizing based on number of options and wheel size
      let fontSize = 16;
      if (activeOptions.length > 25) fontSize = 10;
      else if (activeOptions.length > 15) fontSize = 12;
      else if (activeOptions.length > 8) fontSize = 14;
      
      if (canvasSize < 350) {
        fontSize = Math.max(8, fontSize - 2);
      }

      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      // Truncate text beautifully to fit half of radius
      const maxTextWidth = outerRadius - innerRadius - 25;
      let textToDraw = option.text;
      const measured = ctx.measureText(textToDraw);
      if (measured.width > maxTextWidth) {
        // Simple truncation
        for (let len = textToDraw.length; len > 0; len--) {
          const trunc = textToDraw.substring(0, len) + "...";
          if (ctx.measureText(trunc).width <= maxTextWidth) {
            textToDraw = trunc;
            break;
          }
        }
      }

      ctx.fillText(textToDraw, outerRadius - 15, 0);
      ctx.restore();
    });

    // Outer bold geometric border rim (Geometric Balance)
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(15, 23, 42, 0.25)";
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.lineWidth = 12; // Extra thick geometric border
    ctx.strokeStyle = "#0F172A"; // Slate 900 frame
    ctx.stroke();
    
    // Clear shadow for secondary drawings
    ctx.shadowBlur = 0;

    // Small decorative outer dots (Geometric Balance minimalist style)
    ctx.fillStyle = "#FFFFFF";
    const dotCount = Math.min(36, activeOptions.length * 2);
    for (let i = 0; i < dotCount; i++) {
      const angle = (i * Math.PI * 2) / dotCount + rotation;
      const dx = cx + (outerRadius - 6) * Math.cos(angle);
      const dy = cy + (outerRadius - 6) * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(dx, dy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner core hub shadow and glow (Matching w-16 h-16 bg-slate-900 border-4 border-white)
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0F172A"; // Slate 900 content
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#FFFFFF"; // Premium white border
    ctx.stroke();

    // Center nested white inner circle
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius - 26, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
  };

  // Contrast checker formula
  const isColorLight = (color: string) => {
    const raw = color.replace("#", "");
    if (raw.length !== 6) return false;
    const r = parseInt(raw.substring(0, 2), 16);
    const g = parseInt(raw.substring(2, 4), 16);
    const b = parseInt(raw.substring(4, 6), 16);
    // YIQ formula
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq > 165;
  };

  // Launch Spin Physics Animation
  const startSpin = () => {
    if (isSpinning || activeOptions.length === 0) return;

    onSpinStart();

    // Sound initializer request
    sounds.playTick();

    const duration = config.spinDuration * 1000; // ms
    const startTime = performance.now();

    // Find current base angle modulo 2PI
    const currentAngle = currentRotationRef.current;

    // We want to add at least 5 to 10 full turns for visual thrill, plus random landing
    const totalTurns = 6 + Math.random() * 5;
    const spinAngle = totalTurns * Math.PI * 2;
    const targetAngle = currentAngle + spinAngle;

    // Precision sector track to play ticked audio precisely at boundaries
    const arcSize = (Math.PI * 2) / activeOptions.length;
    let lastTickSectorIndex = -1;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Quintic ease out formula (Very rapid build-up, lingering slowdown for maximum tension)
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const angle = currentAngle + (targetAngle - currentAngle) * easeProgress;
      currentRotationRef.current = angle;

      // Calculate localized index under TOP indicator (pointing at -PI/2)
      // Angle inside the wheel matches standard screen sector
      const topPointerAngle = 1.5 * Math.PI;
      const relativeAngle = (topPointerAngle - angle) % (Math.PI * 2);
      const alignedAngle = relativeAngle < 0 ? relativeAngle + Math.PI * 2 : relativeAngle;
      const currentWheelIndex = Math.floor(alignedAngle / arcSize);

      // Play tick audio on wheel sector transition
      if (currentWheelIndex !== lastTickSectorIndex) {
        lastTickSectorIndex = currentWheelIndex;
        sounds.playTick();
        
        // Trigger pointer bounce/recoil vibration
        setIndicatorActive(true);
        setTimeout(() => setIndicatorActive(false), 30);
      }

      drawWheel(angle);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Landing complete!
        // Retrieve exactly who won
        const winningOption = activeOptions[currentWheelIndex % activeOptions.length];

        onSpinComplete(winningOption);
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div
      id="wheel-outer-panel"
      className="relative flex flex-col items-center justify-center py-6"
    >
      {/* Interactive top pointer/arrow (Geometric Balance Indicator) */}
      <div
        id="wheel-indicator"
        className={`absolute -top-3 z-30 flex flex-col items-center justify-center transition-all duration-75 ${
          indicatorActive ? "translate-y-0.5 scale-y-110" : ""
        }`}
        style={{ left: "calc(50% - 16px)" }}
      >
        <div className="relative h-10 w-[32px]">
          {/* Shadow element */}
          <div className="absolute top-1 left-0.5 h-0 w-0 border-t-[34px] border-l-[16px] border-r-[16px] border-t-black/20 border-l-transparent border-r-transparent" />
          {/* Triangular pointer in High-contrast Slate-900 */}
          <div className="absolute top-0.5 left-0 h-0 w-0 border-t-[32px] border-l-[16px] border-r-[16px] border-t-slate-900 border-l-transparent border-r-transparent" />
          {/* Tiny accent color dot */}
          <div className="absolute top-1 left-[13px] h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </div>
      </div>

      {/* Wheel Canvas Container styled with standard Slate frame styling */}
      <div
        id="wheel-stage-container"
        ref={containerRef}
        className="relative flex aspect-square w-full max-w-[480px] items-center justify-center overflow-hidden rounded-full p-2 bg-slate-50/50 border-[4px] border-slate-200 shadow-inner"
      >
        <canvas
          id="wheel-canvas"
          ref={canvasRef}
          className="cursor-pointer overflow-hidden rounded-full transition-all duration-300 active:scale-[0.985] grayscale-0 filter border-[10px] border-slate-900 shadow-2xl"
          onClick={startSpin}
          style={{
            width: canvasSize,
            height: canvasSize,
          }}
        />

        {/* Central absolute Spin Button Overlay showing our pride flamingo */}
        <button
          id="wheel-central-spin-btn"
          onClick={startSpin}
          disabled={isSpinning || activeOptions.length === 0}
          className={`absolute z-10 flex h-[76px] w-[76px] cursor-pointer items-center justify-center rounded-full border-4 border-slate-900 bg-white shadow-xl transition-all active:scale-95 disabled:cursor-not-allowed ${
            isSpinning
              ? "opacity-90 scale-95"
              : "hover:scale-105"
          }`}
        >
          <img
            src={prideFlamingo}
            alt="Mascota"
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover rounded-full ${isSpinning ? "animate-pulse" : "hover:rotate-12 transition-transform duration-300"}`}
          />
        </button>
      </div>

      {/* Bottom Large Geometric Action Button */}
      <button
        id="geometric-spin-now-btn"
        onClick={startSpin}
        disabled={isSpinning || activeOptions.length === 0}
        className="mt-10 w-full max-w-xs py-4 bg-slate-900 text-white rounded-full text-lg font-black tracking-widest hover:bg-slate-800 active:scale-95 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all outline-none"
      >
        {isSpinning ? "GIRANDO..." : "¡GIRAR AHORA!"}
      </button>

      {/* Helper text */}
      <p id="wheel-helper-text" className="mt-4 text-center font-sans text-xs text-slate-500 uppercase tracking-widest font-semibold">
        {isSpinning
          ? "La suerte está decidiendo..."
          : activeOptions.length === 0
          ? "Añade opciones a la lista para comenzar"
          : "Haz clic sobre el círculo o el botón superior para girar"}
      </p>
    </div>
  );
}
