import React from "react";
import prideFlamingo from "../assets/images/pride_flamingo_1780378704946.png";

const CLOUDS = [
  { left: "2%", top: "16%", scale: 1.35, delay: "0s" },
  { left: "19%", top: "33%", scale: 1.55, delay: "-4s" },
  { left: "42%", top: "18%", scale: 1.4, delay: "-7s" },
  { left: "63%", top: "35%", scale: 1.6, delay: "-2s" },
  { left: "80%", top: "19%", scale: 1.3, delay: "-6s" },
  { left: "54%", top: "46%", scale: 1.15, delay: "-3s" },
];

function CloudShape({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#soft-cloud-shadow)">
        <path
          d="M34 86C18 86 8 74 8 60C8 47 17 36 30 34C35 18 49 8 66 8C80 8 93 14 101 24C108 20 116 18 124 18C147 18 166 35 168 58C170 58 173 58 175 58C191 58 204 71 204 86H34Z"
          fill="url(#cloud-pink-grad)"
          fillOpacity="0.95"
        />
      </g>
      <defs>
        <linearGradient id="cloud-pink-grad" x1="8" y1="8" x2="204" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe4f6" />
          <stop offset="0.5" stopColor="#ffc1ec" />
          <stop offset="1" stopColor="#ff9fdd" />
        </linearGradient>
        <filter id="soft-cloud-shadow" x="0" y="0" width="240" height="110" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
    </svg>
  );
}

export default function FloatingDecorations() {
  return (
    <div id="celestial-decorator-root" className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      <div
        id="pink-sky-bg"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 25% 15%, rgba(255,236,250,0.95) 0%, rgba(255,179,233,0.5) 35%, rgba(255,140,218,0.3) 56%, transparent 74%), radial-gradient(circle at 78% 20%, rgba(255,201,238,0.4) 0%, transparent 42%), linear-gradient(170deg, #1d0f57 0%, #2f1a73 42%, #4a1d8b 74%, #6328a8 100%)",
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,196,232,0.4),transparent_46%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_45%,rgba(255,150,214,0.18),transparent_52%)]" />

      <div className="absolute inset-0 animate-rainbow-stream opacity-90">
        <svg viewBox="0 0 1600 900" className="h-full w-full" xmlns="http://www.w3.org/2000/svg" fill="none">
          <defs>
            <linearGradient id="loop-rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff4e99" stopOpacity="0.62" />
              <stop offset="20%" stopColor="#ff7a45" stopOpacity="0.56" />
              <stop offset="40%" stopColor="#ffd85d" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#67e08b" stopOpacity="0.56" />
              <stop offset="80%" stopColor="#67beff" stopOpacity="0.54" />
              <stop offset="100%" stopColor="#b98bff" stopOpacity="0.62" />
            </linearGradient>
          </defs>

          <path d="M40 560 C170 330, 330 330, 460 560" stroke="url(#loop-rainbow)" strokeWidth="56" strokeLinecap="round" />
          <path d="M440 560 C570 330, 730 330, 860 560" stroke="url(#loop-rainbow)" strokeWidth="56" strokeLinecap="round" />
          <path d="M840 560 C970 330, 1130 330, 1260 560" stroke="url(#loop-rainbow)" strokeWidth="56" strokeLinecap="round" />
          <path d="M1240 560 C1370 330, 1530 330, 1660 560" stroke="url(#loop-rainbow)" strokeWidth="56" strokeLinecap="round" />

          <path d="M40 560 C170 330, 330 330, 460 560" stroke="white" strokeOpacity="0.24" strokeWidth="14" strokeLinecap="round" />
          <path d="M440 560 C570 330, 730 330, 860 560" stroke="white" strokeOpacity="0.24" strokeWidth="14" strokeLinecap="round" />
          <path d="M840 560 C970 330, 1130 330, 1260 560" stroke="white" strokeOpacity="0.24" strokeWidth="14" strokeLinecap="round" />
          <path d="M1240 560 C1370 330, 1530 330, 1660 560" stroke="white" strokeOpacity="0.24" strokeWidth="14" strokeLinecap="round" />
        </svg>
      </div>

      {CLOUDS.map((cloud, idx) => (
        <div
          key={`cloud-${idx}`}
          className="absolute animate-cloud-bob"
          style={{
            left: cloud.left,
            top: cloud.top,
            width: `${280 * cloud.scale}px`,
            height: `${140 * cloud.scale}px`,
            // @ts-ignore
            "--cloud-delay": cloud.delay,
          }}
        >
          <CloudShape className="h-full w-full drop-shadow-[0_0_38px_rgba(255,176,228,0.78)]" />
        </div>
      ))}

      <div className="absolute left-[42%] top-[23%] w-28 h-28 sm:w-32 sm:h-32 animate-flamingo-happy-float">
        <img
          src={prideFlamingo}
          alt="Flamingo feliz en la nube"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)]"
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-44 pointer-events-none animate-cloud-drift">
        <svg viewBox="0 0 1440 280" fill="none" className="h-full w-[120%] min-w-[1440px] -ml-[10%]" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 220C68 220 126 176 190 176C254 176 293 223 352 223C411 223 465 184 529 184C593 184 651 240 710 240C769 240 807 198 862 198C917 198 974 244 1035 244C1096 244 1148 194 1214 194C1280 194 1322 229 1380 229C1414 229 1440 216 1440 216V280H0V220Z"
            fill="#ffd7f1"
            fillOpacity="0.92"
          />
          <path
            d="M0 243C70 243 119 206 179 206C239 206 292 250 347 250C402 250 462 218 521 218C580 218 631 258 694 258C757 258 799 221 863 221C927 221 976 259 1040 259C1104 259 1158 222 1222 222C1286 222 1338 252 1388 252C1418 252 1440 244 1440 244V280H0V243Z"
            fill="white"
            fillOpacity="0.67"
          />
        </svg>
      </div>
    </div>
  );
}
