import { motion, AnimatePresence } from "motion/react";
import { WheelOption } from "../types";
import { Sparkles, Trophy, X, Trash2, RotateCw } from "lucide-react";
import prideFlamingo from "../assets/images/pride_flamingo_1780378704946.png";

interface WinnerModalProps {
  winner: WheelOption | null;
  isOpen: boolean;
  onClose: () => void;
  onRemoveWinner?: (id: string) => void;
}

export default function WinnerModal({
  winner,
  isOpen,
  onClose,
  onRemoveWinner,
}: WinnerModalProps) {
  if (!winner) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="winner-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Shadow overlay */}
          <motion.div
            id="winner-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal celebratory window card */}
          <motion.div
            id="winner-card"
            initial={{ scale: 0.85, y: 15, opacity: 0 }}
            animate={{
              scale: 1,
              y: 0,
              opacity: 1,
              transition: { type: "spring", damping: 20, stiffness: 220 },
            }}
            exit={{ scale: 0.9, y: 10, opacity: 0 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Elegant themed header card banner */}
            <div
              id="winner-banner"
              className="relative flex flex-col items-center justify-center py-8 text-center text-white"
              style={{
                background: `linear-gradient(135deg, ${winner.color}, #0F172A)`,
              }}
            >
              {/* Abs Close button */}
              <button
                id="close-winner-x-btn"
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full bg-white/10 p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div id="trophy-pulse-container" className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 shadow-inner border border-white/30">
                <img 
                  src={prideFlamingo} 
                  alt="Flamingo Ganador" 
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 object-contain rounded-full animate-bounce" 
                />
                <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-200 animate-pulse" />
              </div>

              <h2 id="winner-announcement-header" className="font-sans text-2xl font-black uppercase tracking-wider text-amber-200">
                ¡Tenemos un Ganador!
              </h2>
              <p id="winner-announcement-sub" className="text-xs font-semibold text-white/70 uppercase tracking-wider mt-1">
                La ruleta ha decidido
              </p>
            </div>

            {/* Modal Body Content */}
            <div id="winner-modal-body" className="p-6 text-center space-y-5">
              {/* Display winning option text using gigantic display typography */}
              <div id="winner-text-banner" className="space-y-1.5 py-4">
                <p id="winner-label" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Elemento Seleccionado
                </p>
                <h1
                  id="winner-text"
                  className="font-sans text-3xl font-black text-slate-800 break-words leading-tight px-4"
                >
                  {winner.text}
                </h1>
              </div>

              {/* Action Buttons Row */}
              <div id="winner-actions-buttons" className="flex flex-col gap-2 pt-2">
                <button
                  id="winner-ok-btn"
                  onClick={onClose}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3.5 text-sm font-bold text-white shadow hover:bg-indigo-700 active:scale-95 transition"
                >
                  <RotateCw className="h-4 w-4 animate-spin-slow" />
                  Girar de Nuevo
                </button>

                {onRemoveWinner && (
                  <button
                    id="winner-remove-action-btn"
                    onClick={() => onRemoveWinner(winner.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-100 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Quitar de la ruleta esta vez
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
