import { WheelConfig, Participant } from "../types";
import { THEMES } from "../utils";
import { Settings, Volume2, VolumeX, Sparkles, Trash2, Sliders, BarChart3, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface ConfigPanelProps {
  config: WheelConfig;
  onConfigChange: (newConfig: WheelConfig) => void;
  isSpinning: boolean;
  onThemeChanged?: (newThemeKey: string) => void;
  participants: Participant[];
}

export default function ConfigPanel({
  config,
  onConfigChange,
  isSpinning,
  onThemeChanged,
  participants,
}: ConfigPanelProps) {
  // Config properties updater
  const updateProp = <K extends keyof WheelConfig>(key: K, value: WheelConfig[K]) => {
    onConfigChange({
      ...config,
      [key]: value,
    });
  };

  // Count the frequency of each wonPrize from the participants list
  const prizeStats = participants.reduce((acc: Record<string, number>, p) => {
    if (p.wonPrize) {
      acc[p.wonPrize] = (acc[p.wonPrize] || 0) + 1;
    }
    return acc;
  }, {});

  const chartData = Object.entries(prizeStats).map(([name, count]) => ({
    name: name.length > 15 ? name.slice(0, 13) + "..." : name,
    fullName: name,
    count,
  }));

  // Sort descending by frequency
  chartData.sort((a, b) => b.count - a.count);

  return (
    <div id="config-panel" className="rounded-xl border border-slate-300 bg-white p-5 shadow-md space-y-6">
      {/* Header element */}
      <div id="config-panel-header" className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <Settings className="h-5 w-5 text-indigo-700" />
        <h3 id="config-panel-title" className="font-sans text-base font-black text-slate-950">
          Ajustes de la Ruleta
        </h3>
      </div>

      {/* ITEM 1: Color Themes Selection */}
      <div id="config-theme-group" className="space-y-2">
        <label id="config-theme-label" className="font-sans text-xs font-black uppercase tracking-wider text-indigo-800 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-md inline-block">
          Paleta de Colores
        </label>
        <div id="config-theme-grid" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {Object.entries(THEMES).map(([key, value]) => {
            const isSelected = config.theme === key;
            return (
              <button
                id={`theme-select-btn-${key}`}
                key={key}
                type="button"
                disabled={isSpinning}
                onClick={() => {
                  updateProp("theme", key);
                  if (onThemeChanged) onThemeChanged(key);
                }}
                className={`flex flex-col gap-1.5 rounded-xl border p-3 text-left transition duration-150 cursor-pointer ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-700 text-white shadow-md scale-[1.01]"
                    : "border-slate-300 bg-slate-50 text-slate-950 hover:border-indigo-500 hover:bg-white hover:text-indigo-700 disabled:opacity-50"
                }`}
              >
                <span id={`theme-pkg-name-${key}`} className={`text-xs font-extrabold ${isSelected ? "text-white" : "text-slate-950"}`}>{value.name}</span>
                {/* Visual mini circles preview */}
                <div id={`theme-preview-dots-${key}`} className="flex gap-1 overflow-hidden">
                  {value.colors.slice(0, 5).map((color, cIdx) => (
                    <div
                      id={`theme-preview-dot-${key}-${cIdx}`}
                      key={cIdx}
                      className={`h-4 w-4 rounded-full border shrink-0 ${isSelected ? "border-white/40" : "border-slate-950/20"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {value.colors.length > 5 && (
                    <span id={`theme-preview-plus-${key}`} className={`text-xs self-center font-black ${isSelected ? "text-indigo-100" : "text-slate-600"}`}>
                      +
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ITEM 2: Single Winner Deletion Rule */}
      <div id="config-checkboxes-group" className="space-y-4 pt-2">
        <div id="config-rule-container" className="flex items-start justify-between gap-4">
          <div id="config-rule-text" className="space-y-1">
            <label id="config-rule-label" className="flex items-center gap-1.5 font-sans text-sm font-extrabold text-slate-950">
              <Trash2 className="h-4.5 w-4.5 text-rose-600" />
              Sorteo de opción única
            </label>
            <span id="config-rule-desc" className="text-xs text-slate-700 block font-semibold leading-normal">
              Elimina automáticamente la opción ganadora de la ruleta para que solo pueda ganar una vez.
            </span>
          </div>
          <button
            id="config-rule-toggle-button"
            type="button"
            disabled={isSpinning}
            onClick={() => updateProp("removeAfterWinner", !config.removeAfterWinner)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-slate-300 transition-colors duration-200 ease-in-out focus:outline-none ${
              config.removeAfterWinner ? "bg-rose-500" : "bg-slate-300"
            }`}
          >
            <span
              id="config-rule-toggle-circle"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                config.removeAfterWinner ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* ITEM 3: Sound Engine Tic/Tac Toggle */}
        <div id="config-sound-container" className="flex items-start justify-between gap-4 border-t border-slate-200 pt-4">
          <div id="config-sound-text" className="space-y-1">
            <label id="config-sound-label" className="flex items-center gap-1.5 font-sans text-sm font-extrabold text-slate-950">
              {config.soundEnabled ? (
                <Volume2 className="h-4.5 w-4.5 text-indigo-700" />
              ) : (
                <VolumeX className="h-4.5 w-4.5 text-slate-600" />
              )}
              Sonidos interactivos
            </label>
            <span id="config-sound-desc" className="text-xs text-slate-700 block font-semibold leading-normal">
              Reproduce un efecto de tic-tac realista mientras gira y una fanfarria cuando se detiene.
            </span>
          </div>
          <button
            id="config-sound-toggle-button"
            type="button"
            disabled={isSpinning}
            onClick={() => updateProp("soundEnabled", !config.soundEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-slate-300 transition-colors duration-200 ease-in-out focus:outline-none ${
              config.soundEnabled ? "bg-indigo-700" : "bg-slate-300"
            }`}
          >
            <span
              id="config-sound-toggle-circle"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                config.soundEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* ITEM 4: Celebrating Confetti Particles Toggle */}
        <div id="config-confetti-container" className="flex items-start justify-between gap-4 border-t border-slate-200 pt-4">
          <div id="config-confetti-text" className="space-y-1">
            <label id="config-confetti-label" className="flex items-center gap-1.5 font-sans text-sm font-extrabold text-slate-950">
              <Sparkles className="h-4.5 w-4.5 text-indigo-700" />
              Efecto de confeti
            </label>
            <span id="config-confetti-desc" className="text-xs text-slate-700 block font-semibold leading-normal">
              Lanza una lluvia de papeles de colores cada vez que un elemento salga seleccionado.
            </span>
          </div>
          <button
            id="config-confetti-toggle-button"
            type="button"
            disabled={isSpinning}
            onClick={() => updateProp("showConfetti", !config.showConfetti)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-slate-300 transition-colors duration-200 ease-in-out focus:outline-none ${
              config.showConfetti ? "bg-indigo-700" : "bg-slate-300"
            }`}
          >
            <span
              id="config-confetti-toggle-circle"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                config.showConfetti ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* ITEM 5: Spin Speed / Duration Settings */}
        <div id="config-duration-container" className="border-t border-slate-200 pt-5 space-y-2">
          <div id="config-duration-header" className="flex items-center justify-between">
            <label id="config-duration-label" className="flex items-center gap-1.5 font-sans text-sm font-extrabold text-slate-950">
              <Sliders className="h-4.5 w-4.5 text-indigo-700" />
              Duración del Giro
            </label>
            <span id="config-duration-value" className="font-mono text-xs font-black text-indigo-900 bg-indigo-100 border-2 border-indigo-200 px-2 py-0.5 rounded">
              {config.spinDuration} segundos
            </span>
          </div>
          <input
            id="config-duration-slider"
            type="range"
            min={2}
            max={10}
            step={0.5}
            disabled={isSpinning}
            value={config.spinDuration}
            onChange={(e) => updateProp("spinDuration", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-700 disabled:opacity-50"
          />
          <div id="config-duration-ticks" className="flex justify-between text-[11px] font-bold text-slate-700 px-1">
            <span>Rápido (2s)</span>
            <span>Estándar (5s)</span>
            <span>Tensión (10s)</span>
          </div>
        </div>
      </div>

      {/* ITEM 6: Recharts Prize Frequency Analytics */}
      <div id="analytics-chart-card" className="border-t border-slate-200 pt-6 space-y-4">
        <label className="font-sans text-xs font-black uppercase tracking-wider text-[#d01c6f] bg-[#ff4694]/15 px-3 py-1.5 rounded-full border border-[#ff4694]/40 inline-flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          Frecuencia de Premios Ganados
        </label>
        
        {chartData.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center bg-slate-50/70">
            <TrendingUp className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No hay datos de premios registrados aún</p>
            <p className="text-xs text-slate-600 mt-1.5 max-w-xs mx-auto leading-normal font-semibold">
              Cuando los participantes registrados jueguen y ganen premios en la ruleta, aquí podrás ver las frecuencias y tendencias de los premios.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-800 leading-relaxed font-semibold">
              Frecuencia de premios ganados por los clientes registrados. Ayuda a identificar las opciones más recurrentes y la distribución de premios de <strong className="text-indigo-900 font-extrabold">Ruleta Pride 2</strong>.
            </p>
            
            <div className="h-64 w-full bg-slate-100 rounded-xl p-3 border border-slate-300">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#1e293b', fontSize: 10, fontWeight: 700 }}
                    axisLine={{ stroke: '#94a3b8' }}
                    tickLine={false}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fill: '#1e293b', fontSize: 10, fontWeight: 700 }}
                    axisLine={{ stroke: '#94a3b8' }}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 text-white rounded-lg p-3 text-xs shadow-xl border-2 border-slate-800">
                            <p className="font-black text-rose-300">{data.fullName}</p>
                            <p className="text-emerald-400 font-extrabold mt-1">
                              Veces ganado: {data.count}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, index) => {
                      const spectrum = [
                        '#ff4694', // Original Pride Pink
                        '#ff7043', // Red-Orange
                        '#e2b400', // Yellow-Gold
                        '#4caf50', // Green
                        '#29b6f6', // Light Blue
                        '#ab47bc', // Purple
                        '#6366f1', // Indigo
                      ];
                      return <Cell key={`cell-${index}`} fill={spectrum[index % spectrum.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Insight Stats Summary Row */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-1">
              <div className="bg-pink-100 border border-pink-300 rounded-xl p-3 text-center shadow-sm">
                <span className="text-[10px] uppercase font-black text-pink-900 block tracking-wider">Total Clientes Premiados</span>
                <span className="text-sm font-black text-pink-950">
                  {participants.filter(p => p.wonPrize).length} ganadores
                </span>
              </div>
              <div className="bg-indigo-100 border border-indigo-300 rounded-xl p-3 text-center shadow-sm">
                <span className="text-[10px] uppercase font-black text-indigo-900 block tracking-wider">Premio Más Frecuente</span>
                <span className="text-sm font-black text-indigo-950 truncate block max-w-full px-1">
                  {chartData[0]?.fullName || "Ninguno"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
