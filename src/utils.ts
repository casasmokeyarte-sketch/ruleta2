import { Preset, WheelOption } from "./types";

export const LOSING_TEXT = "Perdio Veci que pena";

export function isLosingText(value: unknown) {
  const safe = typeof value === "string" ? value : "";
  const t = safe.trim().toLowerCase();
  const losing = LOSING_TEXT.trim().toLowerCase();
  return (
    t === losing ||
    t.includes("sin premio") ||
    t.includes("no premio") ||
    t.includes("perdio") ||
    t.includes("perdió")
  );
}

// Built-in color themes
export const THEMES: Record<string, { name: string; colors: string[] }> = {
  rainbow: {
    name: "Arcoíris",
    colors: [
      "#EF4444", // Red
      "#F97316", // Orange
      "#F59E0B", // Yellow
      "#10B981", // Green
      "#3B82F6", // Blue
      "#6366F1", // Indigo
      "#8B5CF6", // Violet
      "#EC4899", // Pink
    ],
  },
  pastel: {
    name: "Pastel",
    colors: [
      "#FF9AA2", // Soft red
      "#FFB7B2", // Soft peach
      "#FFDAC1", // Soft orange
      "#E2F0CB", // Soft light green
      "#B5EAD7", // Soft mint
      "#C7CEEA", // Soft lavender
      "#FFC6FF", // Soft purple
      "#BDB2FF", // Soft violet
    ],
  },
  neon: {
    name: "Neón Eléctrico",
    colors: [
      "#10B981", // Neon Green
      "#06B6D4", // Neon Cyan
      "#3B82F6", // Neon Blue
      "#8B5CF6", // Neon Purple
      "#D946EF", // Neon Fuchsia
      "#F43F5E", // Neon Pink
      "#F59E0B", // Neon Gold
    ],
  },
  sunset: {
    name: "Atardecer Cálido",
    colors: [
      "#F43F5E", // Rose
      "#E11D48", // Darker rose
      "#EA580C", // Orange-red
      "#F97316", // Orange
      "#F59E0B", // Gold
      "#BE185D", // Wine purple
      "#831843", // Warm dark purple
    ],
  },
  ocean: {
    name: "Mar Profundo",
    colors: [
      "#0284C7", // Sky blue
      "#0369A1", // Ocean blue
      "#075985", // Deep blue
      "#0F766E", // Deep teal
      "#14B8A6", // Teal
      "#2DD4BF", // Minty turquoise
      "#06B6D4", // Cyan
    ],
  },
};

// Built-in lists of options
export const PRESETS: Preset[] = [
  {
    id: "pride",
    name: "🏳️‍🌈 Premios Pride",
    options: [
      "Bongs de Cristal Pequeño",
      "Pipa de Tu Eleccion",
      "Perdio Veci que pena", 
      "50% en tu proxima compra",
      "Premio Sorpresa 🎁",
      "Perdio Veci que pena",
      "Pipa de Tu Eleccion",
      "Otra Oportunidad Girar🔄",
      "Perdio Veci que pena",
      "Bongs de Cristal Pequeño",
      "Premio Sorpresa 🎁",
      "10% en tu proxima compra",
    ],
  },
  {
    id: "food",
    name: "🍕 ¿Qué Cenamos Hoy?",
    options: [
      "Pizza 🍕",
      "Hamburguesas 🍔",
      "Sushi de Salmón 🍣",
      "Tacos al Pastor 🌮",
      "Pasta Italiana 🍝",
      "Ensalada Saludable 🥗",
      "Pollo Asado 🍗",
      "Empanadas Caseras 🥟",
    ],
  },
  {
    id: "chores",
    name: "🧹 Tareas del Hogar",
    options: [
      "Lavar los Platos 🍽️",
      "Limpiar la Cocina 🍳",
      "Sacar la Basura 🗑️",
      "Limpiar el Baño 🧹",
      "Hacer las Compras 🛒",
      "Regar las Plantas 🪴",
      "Barrer y Fregar 🪵",
    ],
  },
  {
    id: "movies",
    name: "🍿 Género de Película",
    options: [
      "Acción / Aventura 🎬",
      "Comedia de Risas 🍿",
      "Misterio / Terror 👻",
      "Ciencia Ficción 🚀",
      "Drama Profundo 🎭",
      "Fantasía Mágica 🦄",
      "Documental / Realidad 🌍",
    ],
  },
  {
    id: "yesno",
    name: "✅ Sí o No",
    options: [
      "¡SÍ! ✅",
      "¡NO! ❌",
      "Tal vez... 🤔",
      "Intenta de nuevo 🔄",
      "Pregunta más tarde ⏳",
    ],
  },
  {
    id: "truthdare",
    name: "🗣️ Verdad o Reto",
    options: [
      "¡VERDAD! 🗣️",
      "¡RETO! ⚡",
      "¡VERDAD! 🗣️",
      "¡RETO! ⚡",
    ],
  },
];

// Lazily initialized synthesized system sound generator
class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Avoid node build errors, context will run in browser
  }

  setEnabled(val: boolean) {
    this.soundEnabled = val;
  }

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playTick() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      // Ignored gracefully under constrained system environments
    }
  }

  playWin() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Arpeggio chord in C major
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.5]; // C4, E4, G4, C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.4);
      });
    } catch (e) {
      // Ignored gracefully
    }
  }

  playLose() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Descending minor-like cue for losing result
      const notes = [392.0, 329.63, 293.66, 261.63];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.05, now + idx * 0.08 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.24);
      });
    } catch (e) {
      // Ignored gracefully
    }
  }

  playCrowdOhNo() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Noise-like breathy "ohhh" using filtered sawtooth layers
      const freqs = [210, 180, 150];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const filter = this.ctx!.createBiquadFilter();
        const gain = this.ctx!.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);
        osc.frequency.exponentialRampToValueAtTime(Math.max(90, freq - 60), now + 0.55 + idx * 0.02);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(900, now);
        filter.Q.value = 0.8;

        gain.gain.setValueAtTime(0.0001, now + idx * 0.03);
        gain.gain.linearRampToValueAtTime(0.03, now + 0.12 + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72 + idx * 0.02);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.03);
        osc.stop(now + 0.78 + idx * 0.02);
      });
    } catch (e) {
      // Ignored gracefully
    }
  }
}

export const sounds = new SoundEngine();

// Dynamic assign of colors based on theme
export function applyColors(options: string[], themeKey: string): WheelOption[] {
  const palette = THEMES[themeKey]?.colors || THEMES.rainbow.colors;
  return options.map((opt, idx) => ({
    id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
    text: opt,
    color: palette[idx % palette.length],
    enabled: true,
    stock: null,
  }));
}
