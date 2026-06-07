import React, { useState } from "react";
import { motion } from "motion/react";
import { Participant } from "../types";
import { ShieldCheck, User, MapPin, Phone, Mail, AlertTriangle } from "lucide-react";
import prideFlamingo from "../assets/images/pride_flamingo_1780378704946.png";
import FloatingDecorations from "./FloatingDecorations";

interface RegistrationPortalProps {
  onRegister: (participant: Participant) => void;
}

export default function RegistrationPortal({ onRegister }: RegistrationPortalProps) {
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedName = fullName.trim();
    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedAddress || !trimmedPhone || !trimmedEmail) {
      setErrorMsg("Por favor, llena absolutamente todas las casillas obligatorias.");
      return;
    }

    if (!acceptedTerms) {
      setErrorMsg("Debe aceptar los términos y condiciones de protección de datos para participar.");
      return;
    }

    const newParticipant: Participant = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      fullName: trimmedName,
      address: trimmedAddress,
      phone: trimmedPhone,
      email: trimmedEmail,
      timestamp: new Date().toLocaleString("es-ES"),
    };

    onRegister(newParticipant);
  };

  return (
    <div 
      id="portal-overlay" 
      className="min-h-screen w-full text-slate-100 flex items-center justify-center py-10 px-4 relative overflow-hidden"
    >
      {/* Dreamy animated pastel rainbow background with starry clouds and floating feathers */}
      <FloatingDecorations />

      <motion.div
        id="portal-container"
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg bg-slate-950/85 border border-slate-800/80 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative z-10 backdrop-blur-md"
      >
        {/* Brand/Welcome header with Flamingo Mascot */}
        <div id="portal-header" className="text-center mb-6 relative">
          <div className="relative inline-block mb-3.5">
            {/* Glowing aura around the mascot */}
            <div className="absolute inset-0 bg-pink-500/20 rounded-full blur-xl scale-125 animate-pulse" />
            <img 
              src={prideFlamingo} 
              alt="Mascota Flamingo Pride 2" 
              referrerPolicy="no-referrer"
              className="mx-auto h-24 w-24 object-contain rounded-full border-4 border-pink-400 bg-white/20 shadow-xl shadow-pink-500/20 transform hover:scale-105 transition-transform animate-logo-float"
            />
            <span className="absolute bottom-0 right-1 bg-gradient-to-r from-pink-500 to-indigo-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full uppercase border border-white">
              🦩 ESTRELLA
            </span>
          </div>
          
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent block">
              Casa Smoke y Arte OT SSOT S.A.S
            </span>
            <h2 id="portal-title" className="font-sans text-3xl sm:text-4xl font-black tracking-tight text-white leading-none">
              Ruleta Pride 2
            </h2>
          </div>
          <p id="portal-subtitle" className="mt-3 text-[12px] text-slate-300 font-semibold max-w-sm mx-auto leading-relaxed">
            Completa tus datos obligatorios de forma segura para habilitar un giro en la ruleta de premios.
          </p>
        </div>

        {errorMsg && (
          <motion.div
            id="portal-error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-bold flex items-start gap-2.5"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        <form id="portal-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Field: Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Nombre y Apellido *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <User className="h-4.5 w-4.5" />
              </span>
              <input
                id="reg-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Escribe tu nombre completo"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Field: Residential Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Dirección de Vivienda *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <MapPin className="h-4.5 w-4.5" />
              </span>
              <input
                id="reg-address"
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle, avenida, barrio o apto"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Grid row for Phone and Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field: Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Número de Celular *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Phone className="h-4.5 w-4.5" />
                </span>
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: +57 320 1234567"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Field: Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Correo Electrónico *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Habeas Data Legal Warning Section */}
          <div id="habeas-data-card" className="mt-6 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/40 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Protección de Datos / Habeas Data</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              De conformidad con la Ley de Protección de Datos Personales, le informamos que sus datos serán tratados con total confidencialidad y absoluta seguridad. Usaremos esta información con el único propósito de llevar el control y registro de los participantes aptos para jugar en la ruleta de premios. No compartiremos su información con terceros.
            </p>
          </div>

          {/* Box: Acceptance checkbox */}
          <div className="flex items-start gap-3 pt-2">
            <input
              id="reg-terms-check"
              type="checkbox"
              required
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="reg-terms-check" className="text-xs text-slate-300 font-semibold leading-tight select-none cursor-pointer">
              He leído y acepto los términos y condiciones. Autorizo el tratamiento de mis datos personales de acuerdo con la política de Habeas Data expuesta.
            </label>
          </div>

          {/* Button: Continue */}
          <button
            id="portal-submit-btn"
            type="submit"
            className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black tracking-widest uppercase transition-all shadow-lg active:scale-95 duration-150 outline-none"
          >
            Registrarse y Continuar
          </button>
        </form>
      </motion.div>
    </div>
  );
}
