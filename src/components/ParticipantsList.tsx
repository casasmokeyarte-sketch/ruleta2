import React, { useState } from "react";
import { Participant } from "../types";
import { Trash2, Download, Search, User, MapPin, Phone, Mail, Gift, Calendar, CheckCircle } from "lucide-react";

interface ParticipantsListProps {
  participants: Participant[];
  onClearAll: () => void;
  onRemoveParticipant: (id: string) => void;
  onShowToast: (message: string, type?: "success" | "error" | "info") => void;
}

export default function ParticipantsList({
  participants,
  onClearAll,
  onRemoveParticipant,
  onShowToast,
}: ParticipantsListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = participants.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      (p.wonPrize && p.wonPrize.toLowerCase().includes(q))
    );
  });

  const exportCSV = () => {
    if (participants.length === 0) {
      onShowToast("No hay registros para exportar", "error");
      return;
    }

    try {
      const headers = ["ID", "Nombre Completo", "Direccion", "Celular", "Correo Electronico", "Fecha de Registro", "Premio Ganado"];
      const rows = participants.map((p) => [
        p.id,
        p.fullName,
        p.address,
        p.phone,
        p.email,
        p.timestamp,
        p.wonPrize || "Aún no ha girado",
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" +
        [headers.join(";"), ...rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";"))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `registro_participantes_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onShowToast("¡Archivo CSV exportado exitosamente!", "success");
    } catch (e) {
      onShowToast("Error al exportar registros", "error");
    }
  };

  const handleClear = () => {
    if (window.confirm("¿Seguro que deseas eliminar absolutamente todos los registros de los clientes? Esta acción es irreversible.")) {
      onClearAll();
      onShowToast("Se han eliminado todos los registros de clientes", "success");
    }
  };

  return (
    <div id="participants-panel" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
      {/* Header bar */}
      <div id="participants-panel-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h3 id="participants-panel-title" className="font-sans text-sm font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle className="h-4.5 w-4.5 text-indigo-600" />
            Registro y Control de Participantes ({participants.length})
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Lista de personas registradas antes de jugar con su premio asignado.
          </p>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button
            id="export-csv-btn"
            onClick={exportCSV}
            title="Exportar base de datos a Excel/CSV"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-500 hover:text-indigo-600 transition"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
          
          <button
            id="clear-all-participants"
            onClick={handleClear}
            disabled={participants.length === 0}
            title="Borrar todos los registros"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-rose-50 hover:border-rose-200 transition disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
            Vaciar Todo
          </button>
        </div>
      </div>

      {/* Filter and Search box */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
          <Search className="h-4 w-4" />
        </span>
        <input
          id="participants-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar participante por nombre, correo, celular o premio..."
          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
        />
      </div>

      {/* Grid or Table listing participants */}
      {filtered.length === 0 ? (
        <div id="no-participants-box" className="p-10 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
          <User className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">
            {participants.length === 0
              ? "Ningún participante se ha registrado todavía en esta sesión."
              : "No se encontraron participantes con los criterios de búsqueda."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3">Participante</th>
                <th className="p-3">Datos de Contacto</th>
                <th className="p-3">Dirección</th>
                <th className="p-3">Premio / Juego</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Name and time */}
                  <td className="p-3">
                    <div className="font-bold text-slate-800">{p.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3 inline text-slate-300" />
                      {p.timestamp}
                    </div>
                  </td>
                  
                  {/* Contacts */}
                  <td className="p-3 space-y-0.5">
                    <div className="text-slate-600 font-semibold flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {p.phone}
                    </div>
                    <div className="text-slate-500 flex items-center gap-1">
                      <Mail className="h-3 w-3 text-slate-400" />
                      {p.email}
                    </div>
                  </td>

                  {/* Housing Address */}
                  <td className="p-3 text-slate-600 font-semibold">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[160px]" title={p.address}>{p.address}</span>
                    </div>
                  </td>

                  {/* Spun & Won */}
                  <td className="p-3">
                    {p.wonPrize ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Gift className="h-3 w-3 text-indigo-500 animate-bounce" />
                        {p.wonPrize}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                        Pendiente por girar
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-center">
                    <button
                      id={`remove-participant-${p.id}`}
                      onClick={() => onRemoveParticipant(p.id)}
                      title="Eliminar este cliente"
                      className="rounded-lg p-1.5 text-slate-400 hover:text-red-500 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
