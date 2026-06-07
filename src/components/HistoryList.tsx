import { SpinResult } from "../types";
import { ListRestart, Trash2, Calendar, Sparkles } from "lucide-react";

interface HistoryListProps {
  results: SpinResult[];
  onClearHistory: () => void;
  onRestoreOption?: (text: string) => void;
}

export default function HistoryList({
  results,
  onClearHistory,
  onRestoreOption,
}: HistoryListProps) {
  return (
    <div id="history-panel" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      {/* Header element */}
      <div id="history-panel-header" className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div id="history-title-group" className="flex items-center gap-2">
          <ListRestart className="h-4 w-4 text-indigo-600" />
          <h3 id="history-panel-title" className="font-sans text-sm font-bold text-slate-800">
            Historial de Premiados
          </h3>
        </div>
        {results.length > 0 && (
          <button
            id="clear-history-icon-btn"
            onClick={onClearHistory}
            className="flex items-center gap-1 font-sans text-xs font-semibold text-slate-400 hover:text-red-500 transition"
          >
            <Trash2 className="h-3 w-3" />
            Borrar Todo
          </button>
        )}
      </div>

      {results.length === 0 ? (
        /* Empty history placeholder */
        <div id="history-empty-placeholder" className="py-8 text-center text-slate-400">
          <Calendar className="mx-auto h-8 w-8 text-slate-200 mb-2" />
          <p id="history-empty-text-main" className="text-xs font-medium">Aún no se ha realizado ningún giro</p>
          <p id="history-empty-text-desc" className="text-[10px] text-slate-400 mt-1">Los ganadores aparecerán aquí cronológicamente</p>
        </div>
      ) : (
        /* Results list */
        <div id="history-list-scrollable" className="max-h-[250px] overflow-y-auto space-y-2 pr-1">
          {results.map((res, index) => {
            // Label count
            const raffleNumber = results.length - index;
            return (
              <div
                id={`history-row-${res.id}`}
                key={res.id}
                className="group relative flex items-center justify-between gap-3 rounded-xl border border-slate-50 bg-slate-50/30 p-3 hover:border-slate-100 hover:bg-slate-50/80 transition"
              >
                {/* Visual marker of the drawing */}
                <div id={`history-marker-${res.id}`} className="min-w-0 flex-1">
                  <div id={`history-win-header-${res.id}`} className="flex items-center gap-1.5 mb-1">
                    <span id={`history-serial-${res.id}`} className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      Giro #{raffleNumber}
                    </span>
                    <span id={`history-time-${res.id}`} className="font-sans text-[10px] text-slate-400">
                      {res.timestamp}
                    </span>
                  </div>
                  <p id={`history-win-text-${res.id}`} className="font-sans text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                    {res.optionText}
                  </p>
                </div>

                {/* Restore button if the element was deleted/withdrawn */}
                {onRestoreOption && (
                  <button
                    id={`restore-history-option-${res.id}`}
                    onClick={() => onRestoreOption(res.optionText)}
                    title="Añadir este elemento de vuelta a la ruleta si no existe como activo"
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition opacity-80 group-hover:opacity-100"
                  >
                    Reactivar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
