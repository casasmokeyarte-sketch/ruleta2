import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WheelOption, Preset } from "../types";
import { THEMES, PRESETS, applyColors, LOSING_TEXT, isLosingText } from "../utils";
import {
  Plus,
  Trash2,
  Shuffle,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  ClipboardList,
  Edit2,
  Check,
} from "lucide-react";

interface OptionsEditorProps {
  options: WheelOption[];
  onOptionsChange: (newOptions: WheelOption[]) => void;
  configTheme: string;
  isSpinning: boolean;
}

export default function OptionsEditor({
  options,
  onOptionsChange,
  configTheme,
  isSpinning,
}: OptionsEditorProps) {
  const [singleInput, setSingleInput] = useState<string>("");
  const [bulkMode, setBulkMode] = useState<boolean>(false);
  const [bulkText, setBulkText] = useState<string>("");

  // Segment text editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  const parseBulkLine = (rawLine: string): { text: string; stock: number | null } | null => {
    const line = rawLine.trim();
    if (!line) return null;

    const parts = line.split("|").map((p) => p.trim());
    if (parts.length >= 2) {
      const maybeQty = parts[parts.length - 1];
      if (/^\d+$/.test(maybeQty)) {
        const text = parts.slice(0, -1).join(" | ").trim();
        if (!text) return null;
        return {
          text,
          stock: isLosingText(text) ? null : Number.parseInt(maybeQty, 10),
        };
      }
    }

    return {
      text: line,
      stock: isLosingText(line) ? null : null,
    };
  };

  // Handler to add a single option
  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = singleInput.trim();
    if (!trimmed) return;

    // Check if item is already present
    const palette = THEMES[configTheme]?.colors || THEMES.rainbow.colors;
    const nextIdx = options.length;
    const color = palette[nextIdx % palette.length];

    const newOption: WheelOption = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: trimmed,
      color,
      enabled: true,
      stock: null,
    };

    onOptionsChange([...options, newOption]);
    setSingleInput("");
  };

  // Convert raw single-line option list into WheelOptions
  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = bulkText
      .split("\n")
      .map(parseBulkLine)
      .filter((line): line is { text: string; stock: number | null } => Boolean(line));

    if (parsed.length === 0) return;

    const base = applyColors(parsed.map((p) => p.text), configTheme);
    const newOpts = base.map((opt, idx) => ({
      ...opt,
      stock: parsed[idx].stock,
      enabled: parsed[idx].stock === null ? true : parsed[idx].stock > 0,
    }));

    if (!newOpts.some((o) => isLosingText(o.text))) {
      const palette = THEMES[configTheme]?.colors || THEMES.rainbow.colors;
      const loseColor = palette[newOpts.length % palette.length];
      newOpts.push({
        id: `lose-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text: LOSING_TEXT,
        color: loseColor,
        enabled: true,
        stock: null,
      });
    }

    onOptionsChange(newOpts);
    setBulkMode(false);
  };

  const updateStock = (id: string, rawValue: string) => {
    if (isSpinning) return;

    const value = rawValue.trim();
    const updated = options.map((o) => {
      if (o.id !== id) return o;
      if (isLosingText(o.text)) return { ...o, stock: null, enabled: true };

      if (value === "") {
        return { ...o, stock: null };
      }

      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) return o;
      const stock = Math.max(0, parsed);
      return {
        ...o,
        stock,
        enabled: stock > 0,
      };
    });

    onOptionsChange(updated);
  };

  // Trigger bulk edit text area initialization
  const enterBulkMode = () => {
    const rawLines = options.map((o) => o.text).join("\n");
    setBulkText(rawLines);
    setBulkMode(true);
  };

  // Toggle option enabled status
  const toggleEnabled = (id: string) => {
    if (isSpinning) return;
    const updated = options.map((o) =>
      o.id === id ? { ...o, enabled: !o.enabled } : o
    );
    onOptionsChange(updated);
  };

  // Save localized segment rename
  const saveEdit = (id: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const updated = options.map((o) =>
      o.id === id ? { ...o, text: trimmed } : o
    );
    onOptionsChange(updated);
    setEditingId(null);
  };

  // Delete option
  const deleteOption = (id: string) => {
    if (isSpinning) return;
    const updated = options.filter((o) => o.id !== id);
    // Re-apply themed colors to keep index color patterns clean
    const rawTexts = updated.map((o) => o.text);
    const reColored = applyColors(rawTexts, configTheme);
    
    // Copy the enabled state back where possible
    const fullyMapped = reColored.map((re, idx) => {
      const original = updated[idx];
      return {
        ...re,
        enabled: original ? original.enabled : true,
        stock: original ? original.stock ?? null : null,
      };
    });

    onOptionsChange(fullyMapped);
    if (editingId === id) setEditingId(null);
  };

  // Select a preset template
  const applyPreset = (preset: Preset) => {
    if (isSpinning) return;
    const loaded = applyColors(preset.options, configTheme);
    onOptionsChange(loaded);
  };

  // Shuffle order of options
  const handleShuffle = () => {
    if (isSpinning || options.length <= 1) return;
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    onOptionsChange(shuffled);
  };

  // Clear all options
  const handleClearAll = () => {
    if (isSpinning) return;
    if (window.confirm("¿Seguro que deseas vaciar todas las opciones?")) {
      onOptionsChange([]);
      setEditingId(null);
    }
  };

  // Re-generate option colors with the current theme
  const handleRefreshColors = () => {
    if (isSpinning || options.length === 0) return;
    const rawTexts = options.map((o) => o.text);
    const loaded = applyColors(rawTexts, configTheme);
    
    // Maintain disabled statuses
    const updated = loaded.map((opt, idx) => ({
      ...opt,
      enabled: options[idx]?.enabled !== false,
      stock: options[idx]?.stock ?? null,
    }));
    onOptionsChange(updated);
  };

  const enabledCount = options.filter((o) => o.enabled).length;

  return (
    <div id="options-editor-panel" className="space-y-6">
      {/* SECTION: Preset Templates */}
      <div id="presets-container" className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <h3 id="presets-heading" className="mb-3 font-sans text-xs font-bold uppercase tracking-wider text-indigo-600">
          Cargar Lista Rápida (Preajustes)
        </h3>
        <div id="presets-buttons" className="flex flex-wrap gap-2">
          {PRESETS.map((pst) => (
            <button
              id={`preset-btn-${pst.id}`}
              key={pst.id}
              onClick={() => applyPreset(pst)}
              disabled={isSpinning}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-50 pointer-events-auto cursor-pointer"
            >
              {pst.name}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION: Direct Input Add */}
      <div id="input-controls-card" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div id="input-controls-header" className="mb-4 flex items-center justify-between">
          <h3 id="input-controls-title" className="font-sans text-sm font-bold text-slate-800">
            Añadir Opciones ({options.length})
          </h3>
          <button
            id="bulk-toggle-btn"
            onClick={() => {
              if (bulkMode) {
                setBulkMode(false);
              } else {
                enterBulkMode();
              }
            }}
            disabled={isSpinning}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 outline-none transition-colors cursor-pointer"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            {bulkMode ? "Añadir individualmente" : "Pegar lista (Fila por Fila)"}
          </button>
        </div>

        {bulkMode ? (
          /* Bulk editing textarea */
          <form id="bulk-edit-form" onSubmit={handleBulkSubmit} className="space-y-3">
            <p id="bulk-edit-desc" className="text-xs text-slate-400">
              Escribe una opcion por linea. Para controlar inventario usa formato: <strong>Premio | cantidad</strong>. La frase perdedora se maneja como <strong>{LOSING_TEXT}</strong>.
            </p>
            <textarea
              id="bulk-edit-textarea"
              rows={6}
              disabled={isSpinning}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Ejemplo:\nBono 10% | 20\nCamiseta | 8\nTermo | 5\n${LOSING_TEXT}`}
              className="w-full rounded-xl border border-slate-200 p-3 font-sans text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
            />
            <div id="bulk-edit-actions" className="flex justify-end gap-2">
              <button
                id="bulk-cancel-btn"
                type="button"
                onClick={() => setBulkMode(false)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="bulk-save-btn"
                type="submit"
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Guardar Lista
              </button>
            </div>
          </form>
        ) : (
          /* Single item adding */
          <form id="single-add-form" onSubmit={handleAddSingle} className="flex gap-2">
            <input
              id="single-add-input"
              type="text"
              required
              disabled={isSpinning}
              placeholder="Nueva opción o nombre (ej. Carlos Gil 🧑‍💻)"
              value={singleInput}
              onChange={(e) => setSingleInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
            />
            <button
              id="single-add-submit"
              type="submit"
              disabled={isSpinning}
              className="flex items-center justify-center rounded-xl bg-indigo-600 px-4.5 text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Global actions row (Shuffle, clear, refresh) */}
        {options.length > 0 && (
          <div id="global-actions-row" className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <div id="stats-badge" className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{enabledCount}</span> de{" "}
              <span className="font-semibold text-slate-700">{options.length}</span> activas
            </div>
            <div id="action-buttons-group" className="flex gap-1 justify-end">
              <button
                id="shuffle-options-btn"
                onClick={handleShuffle}
                disabled={isSpinning || options.length <= 1}
                title="Mezclar el orden de las opciones"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <Shuffle className="h-3 w-3" />
                Mezclar
              </button>
              <button
                id="refresh-colors-btn"
                onClick={handleRefreshColors}
                disabled={isSpinning}
                title="Re-establecer paleta de colores"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Colores
              </button>
              <button
                id="clear-all-btn"
                onClick={handleClearAll}
                disabled={isSpinning}
                title="Vaciar la lista entera"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                Vaciar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION: Item listing table */}
      {options.length > 0 && (
        <div id="options-list-container" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 id="options-list-heading" className="mb-3 font-sans text-xs font-bold uppercase tracking-wider text-indigo-600">
            Elementos de la Ruleta (Configurar cada triángulo)
          </h4>
          <p className="text-[11px] text-slate-400 mb-2 leading-tight">
            💡 Haz doble clic sobre un nombre o presiona el lápiz para personalizar el premio del triángulo ("al gusto").
          </p>
          <div id="options-scrollable-list" className="max-h-[290px] overflow-y-auto pr-1 space-y-1.5">
            <AnimatePresence initial={false}>
              {options.map((option, idx) => (
                <motion.div
                  id={`option-row-${option.id}`}
                  key={option.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  layout
                  className={`group flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 transition hover:bg-slate-50 ${
                    !option.enabled ? "opacity-55 bg-slate-50/50" : ""
                  }`}
                >
                  {/* Visual Bullet & Name */}
                  <div id={`option-info-${option.id}`} className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      id={`option-color-indicator-${option.id}`}
                      className="h-4 w-4 shrink-0 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: option.color }}
                    />
                    
                    {editingId === option.id ? (
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            saveEdit(option.id);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        onBlur={() => saveEdit(option.id)}
                        autoFocus
                        placeholder="Nombre del premio..."
                        className="flex-1 rounded-lg border border-indigo-300 bg-indigo-50/20 px-2 py-1 font-sans text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <span 
                          id={`option-text-${option.id}`} 
                          onDoubleClick={() => {
                            if (!isSpinning) {
                              setEditingId(option.id);
                              setEditingText(option.text);
                            }
                          }}
                          className="truncate font-sans text-sm font-semibold text-slate-900 cursor-pointer selection:bg-indigo-100 block"
                          style={{ color: "#0f172a" }}
                          title="Haz doble clic para editar"
                        >
                          <span className="mr-1 text-slate-600 font-mono text-xs" style={{ color: "#475569" }}>{idx + 1}.</span>
                          {option.text}
                        </span>

                        <div className="mt-1 flex items-center gap-1.5">
                          {isLosingText(option.text) ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">Perdedor</span>
                          ) : (
                            <>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${option.stock === 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                                Stock: {option.stock === null ? "∞" : option.stock}
                              </span>
                              <input
                                type="number"
                                min={0}
                                disabled={isSpinning}
                                value={option.stock === null ? "" : option.stock}
                                onChange={(e) => updateStock(option.id, e.target.value)}
                                placeholder="∞"
                                className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700"
                                title="Cantidad disponible"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Individual Row Control Toolbar */}
                  <div id={`option-row-toolbar-${option.id}`} className="flex items-center gap-1 opacity-90 group-hover:opacity-100 shrink-0">
                    <button
                      id={`edit-option-${option.id}`}
                      onClick={() => {
                        if (isSpinning) return;
                        if (editingId === option.id) {
                          saveEdit(option.id);
                        } else {
                          setEditingId(option.id);
                          setEditingText(option.text);
                        }
                      }}
                      disabled={isSpinning}
                      title="Editar nombre libremente"
                      className="rounded-lg p-1.5 transition text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer disabled:opacity-40"
                    >
                      {editingId === option.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Edit2 className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      id={`toggle-option-enabled-${option.id}`}
                      onClick={() => {
                        if (editingId === option.id) setEditingId(null);
                        toggleEnabled(option.id);
                      }}
                      disabled={isSpinning}
                      title={option.enabled ? "Desactivar" : "Activar"}
                      className={`rounded-lg p-1.5 transition cursor-pointer disabled:opacity-40 ${
                        option.enabled
                          ? "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          : "text-amber-500 hover:text-amber-600 bg-amber-50"
                      }`}
                    >
                      {option.enabled ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      id={`delete-option-${option.id}`}
                      onClick={() => deleteOption(option.id)}
                      disabled={isSpinning}
                      title="Eliminar de la lista"
                      className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
