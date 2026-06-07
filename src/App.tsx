import { useEffect, useState } from "react";
import { WheelOption, WheelConfig, SpinResult, Participant } from "./types";
import { applyColors, PRESETS, THEMES, sounds, LOSING_TEXT, isLosingText } from "./utils";
import Wheel from "./components/Wheel";
import OptionsEditor from "./components/OptionsEditor";
import ConfigPanel from "./components/ConfigPanel";
import HistoryList from "./components/HistoryList";
import WinnerModal from "./components/WinnerModal";
import ConfettiCanvas from "./components/ConfettiCanvas";
import RegistrationPortal from "./components/RegistrationPortal";
import ParticipantsList from "./components/ParticipantsList";
import FlamingoCompanion from "./components/FlamingoCompanion";
import { useToasts } from "./components/Toast";
import FloatingDecorations from "./components/FloatingDecorations";
import prideFlamingo from "./assets/images/pride_flamingo_1780378704946.png";
import {
  Sparkles,
  HelpCircle,
  Lightbulb,
  Heart,
  Volume2,
  VolumeX,
  Users,
  ShieldCheck,
  Key,
  Link2,
  RefreshCw,
} from "lucide-react";

const LOCAL_STORAGE_OPTIONS_KEY = "ruleta_options_data";
const LOCAL_STORAGE_CONFIG_KEY = "ruleta_config_data";
const LOCAL_STORAGE_HISTORY_KEY = "ruleta_history_data";
const LOCAL_STORAGE_PARTICIPANTS_KEY = "ruleta_participants_data";
const RESULT_MESSAGE_DURATION_MS = 60000;

type LinkAccessState = "checking" | "valid" | "missing" | "invalid" | "used" | "expired";

interface LinkAuditItem {
  token: string;
  status: "active" | "used" | "expired";
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  resultText: string;
  participantName: string;
}

type FlamingoReactionMode = "idle" | "win" | "lose";

export default function App() {
  const { showToast } = useToasts();

  const sanitizeLoadedOptions = (raw: unknown): WheelOption[] => {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((entry: any, idx) => {
        if (!entry || typeof entry !== "object") return null;

        const text = typeof entry.text === "string" ? entry.text.trim() : "";
        if (!text) return null;

        const stockRaw = entry.stock;
        const stock =
          stockRaw === null || typeof stockRaw === "undefined"
            ? null
            : Number.isFinite(Number(stockRaw))
            ? Math.max(0, Number(stockRaw))
            : null;

        return {
          id:
            typeof entry.id === "string" && entry.id.trim().length > 0
              ? entry.id
              : `recovered-${Date.now()}-${idx}`,
          text,
          color: typeof entry.color === "string" && entry.color ? entry.color : "#6366F1",
          enabled:
            typeof entry.enabled === "boolean"
              ? entry.enabled
              : stock === null
              ? true
              : stock > 0,
          stock,
        } satisfies WheelOption;
      })
      .filter((o): o is WheelOption => Boolean(o));
  };

  // 1. Core States
  const [options, setOptions] = useState<WheelOption[]>([]);
  const [config, setConfig] = useState<WheelConfig>({
    soundEnabled: true,
    removeAfterWinner: false,
    spinDuration: 5,
    theme: "rainbow",
    showConfetti: true,
  });
  const [results, setResults] = useState<SpinResult[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  
  // Interface mechanics
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winner, setWinner] = useState<WheelOption | null>(null);
  const [isWinnerOpen, setIsWinnerOpen] = useState<boolean>(false);
  const [confettiActive, setConfettiActive] = useState<boolean>(false);
  const [activeTab, setActiveTab2] = useState<"options" | "participants" | "config" | "history">("options");
  const [showIdeas, setShowIdeas] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string>("");
  const [linkAccessState, setLinkAccessState] = useState<LinkAccessState>("checking");
  const [lastGeneratedLink, setLastGeneratedLink] = useState<string>("");
  const [creatingLink, setCreatingLink] = useState<boolean>(false);
  const [linkConsumed, setLinkConsumed] = useState<boolean>(false);
  const [spinAccessLocked, setSpinAccessLocked] = useState<boolean>(false);
  const [linkAudit, setLinkAudit] = useState<LinkAuditItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [isLosingResult, setIsLosingResult] = useState<boolean>(false);
  const [flamingoReactionMode, setFlamingoReactionMode] = useState<FlamingoReactionMode>("idle");
  const [showLoseSticker, setShowLoseSticker] = useState<boolean>(false);

  const isLosingOptionText = (value: string) => isLosingText(value);

  const extractTokenFromLink = (urlValue: string): string => {
    try {
      const parsed = new URL(urlValue);
      return parsed.searchParams.get("token") || "";
    } catch {
      return "";
    }
  };

  const buildRegistrationLink = (token: string): string => {
    const safeToken = encodeURIComponent(token);
    try {
      const current = new URL(window.location.href);
      return `${current.origin}/?token=${safeToken}`;
    } catch {
      return `/?token=${safeToken}`;
    }
  };

  const copyLinkIfStillActive = async (urlValue: string, sourceLabel = "Link") => {
    const token = extractTokenFromLink(urlValue);
    if (!token) {
      showToast("No se encontró el token del link", "error");
      return;
    }

    try {
      const res = await fetch(`/api/one-time-links/${encodeURIComponent(token)}/status`);
      if (!res.ok) {
        showToast("No se pudo validar el estado del link", "error");
        return;
      }

      const data = await res.json();
      if (data.status !== "active") {
        showToast("Ese link ya no está activo y no se puede copiar", "info");
        fetchLinkAudit();
        return;
      }

      await navigator.clipboard.writeText(urlValue);
      showToast(`${sourceLabel} copiado al portapapeles`, "success");
    } catch {
      showToast("No se pudo copiar el link", "error");
    }
  };

  const fetchLinkAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch("/api/one-time-links?limit=12");
      if (res.status === 401) {
        setIsAdminMode(false);
        showToast("Sesion de administrador expirada. Vuelve a autenticarte.", "error");
        return;
      }
      if (!res.ok) {
        throw new Error("No se pudo cargar auditoría");
      }
      const data = await res.json();
      setLinkAudit(Array.isArray(data.items) ? data.items : []);
    } catch {
      showToast("No se pudo cargar historial de links", "error");
    } finally {
      setLoadingAudit(false);
    }
  };

  const validateIncomingToken = async (token: string) => {
    try {
      const res = await fetch(`/api/one-time-links/${encodeURIComponent(token)}/status`);
      if (!res.ok) {
        setLinkAccessState("invalid");
        return;
      }

      const data = await res.json();
      if (data.status === "active") {
        setLinkAccessState("valid");
      } else if (data.status === "used") {
        setLinkAccessState("used");
      } else if (data.status === "expired") {
        setLinkAccessState("expired");
      } else {
        setLinkAccessState("invalid");
      }
    } catch {
      setLinkAccessState("invalid");
    }
  };

  const createOneTimeLink = async () => {
    setCreatingLink(true);
    try {
      const res = await fetch("/api/one-time-links/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.status === 401) {
        setIsAdminMode(false);
        showToast("Sesion de administrador expirada. Inicia sesion de nuevo.", "error");
        return;
      }
      if (!res.ok) {
        throw new Error("No se pudo crear el enlace");
      }

      const data = await res.json();
      const generatedUrl = typeof data.url === "string" && data.url ? data.url : buildRegistrationLink(data.token);
      setLastGeneratedLink(generatedUrl);
      await navigator.clipboard.writeText(generatedUrl);
      showToast("Enlace de un solo uso generado y copiado", "success");
      fetchLinkAudit();
    } catch {
      showToast("Error al generar enlace único", "error");
    } finally {
      setCreatingLink(false);
    }
  };

  const requestAdminAccess = async () => {
    const enteredUser = window.prompt("Usuario administrador:");
    if (enteredUser === null) return;

    const enteredPass = window.prompt("Contraseña:");
    if (enteredPass === null) return;

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: enteredUser.trim(),
          password: enteredPass.trim(),
        }),
      });

      if (!res.ok) {
        showToast("Credenciales incorrectas", "error");
        return;
      }

      setIsAdminMode(true);
      showToast("Modo administrador activado. Ahora puedes configurar la ruleta y ver registros.", "info");
      fetchLinkAudit();
      return;
    } catch {
      showToast("No se pudo validar el acceso administrador", "error");
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Ignore logout transport errors and clean local UI state anyway.
    }

    setIsAdminMode(false);
    setCurrentParticipant(null);
    showToast("Modo de registro de clientes reactivado", "info");
  };

  const validateAdminSession = async () => {
    const tokenInUrl = new URLSearchParams(window.location.search).get("token");
    if (tokenInUrl) {
      setIsAdminMode(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/session");
      if (!res.ok) {
        setIsAdminMode(false);
        return;
      }

      const data = await res.json();
      const authenticated = Boolean(data?.authenticated);
      setIsAdminMode(authenticated);
      if (authenticated) {
        fetchLinkAudit();
      }
    } catch {
      setIsAdminMode(false);
    }
  };

  const consumeOneTimeLink = async (winningOptionText: string, participantName?: string) => {
    if (!accessToken || linkConsumed || isAdminMode) return;

    try {
      const res = await fetch(`/api/one-time-links/${encodeURIComponent(accessToken)}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultText: winningOptionText,
          participantName: participantName || "",
        }),
      });

      if (res.status === 410) {
        setLinkAccessState("expired");
        setLinkConsumed(true);
        return;
      }

      if (res.status === 409) {
        setLinkAccessState("used");
        setLinkConsumed(true);
        return;
      }

      if (!res.ok) {
        throw new Error("No se pudo consumir el enlace");
      }

      setLinkConsumed(true);
      setLinkAccessState("used");

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("token");
      window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    } catch {
      showToast("No se pudo cerrar el enlace único. Intenta recargar.", "error");
    }
  };

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showToast("¡Enlace de la ruleta copiado para compartir!", "success");
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      showToast("Error al copiar enlace", "error");
    }
  };

  // 2. Load Local Storage data on mount
  useEffect(() => {
    validateAdminSession();

    const params = new URLSearchParams(window.location.search);
    const tokenInUrl = params.get("token");

    if (!tokenInUrl) {
      setLinkAccessState("missing");
      return;
    }

    setAccessToken(tokenInUrl);
    setIsAdminMode(false);
    setLinkConsumed(false);
    setSpinAccessLocked(false);
    setLinkAccessState("checking");
    validateIncomingToken(tokenInUrl);
  }, []);

  useEffect(() => {
    // Determine options
    try {
      const storedOpts = localStorage.getItem(LOCAL_STORAGE_OPTIONS_KEY);
      if (storedOpts) {
        const parsed = JSON.parse(storedOpts);
        const normalized = sanitizeLoadedOptions(parsed);
        setOptions(normalized);
        localStorage.setItem(LOCAL_STORAGE_OPTIONS_KEY, JSON.stringify(normalized));
      } else {
        // Fallback to first built-in preset: "students"
        const defaultPresetList = PRESETS[0].options;
        const initial = applyColors(defaultPresetList, "rainbow");
        setOptions(initial);
      }
    } catch (e) {
      // Robust fallback
      const defaultPresetList = PRESETS[0].options;
      const initial = applyColors(defaultPresetList, "rainbow");
      setOptions(initial);
    }

    // Determine config
    try {
      const storedConfig = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
      if (storedConfig) {
        setConfig(JSON.parse(storedConfig));
      }
    } catch (e) {}

    // Determine history results
    try {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (storedHistory) {
        setResults(JSON.parse(storedHistory));
      }
    } catch (e) {}

    // Determine registered participants
    try {
      const storedParticipants = localStorage.getItem(LOCAL_STORAGE_PARTICIPANTS_KEY);
      if (storedParticipants) {
        setParticipants(JSON.parse(storedParticipants));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (isAdminMode && !currentParticipant) {
      fetchLinkAudit();
    }
  }, [isAdminMode, currentParticipant]);

  // 3. Write data to Local Storage when states amend
  const handleSaveOptions = (newOpts: WheelOption[]) => {
    setOptions(newOpts);
    localStorage.setItem(LOCAL_STORAGE_OPTIONS_KEY, JSON.stringify(newOpts));
  };

  const handleSaveConfig = (newConfig: WheelConfig) => {
    setConfig(newConfig);
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(newConfig));
  };

  const recordSpinHistory = async (entry: {
    resultText: string;
    isLosing: boolean;
    linkToken: string;
    wheelOptionId: string;
    spunAt: string;
  }) => {
    try {
      await fetch("/api/spin-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    } catch {
      // Non-blocking: local history already keeps the UI usable if persistence fails.
    }
  };

  // Reapply colors to active options when the theme palette changes
  const handleThemeColorReapply = (newThemeKey: string) => {
    if (options.length === 0) return;
    const rawTexts = options.map((o) => o.text);
    const reColored = applyColors(rawTexts, newThemeKey);
    const merged = reColored.map((o, idx) => ({
      ...o,
      enabled: options[idx]?.enabled !== false,
      stock: options[idx]?.stock ?? null,
    }));
    handleSaveOptions(merged);
  };

  // 4. Spin handlers
  const handleSpinStart = () => {
    if (spinAccessLocked || linkConsumed) return;
    setIsSpinning(true);
    setWinner(null);
    setIsLosingResult(false);
    setFlamingoReactionMode("idle");
    setShowLoseSticker(false);
    setIsWinnerOpen(false);
    setConfettiActive(false);
  };

  const handleSpinComplete = (winningOption: WheelOption) => {
    if (!isAdminMode && Boolean(accessToken)) {
      setSpinAccessLocked(true);
    }

    const losingHit = isLosingOptionText(winningOption.text);
    const finalText = losingHit ? LOSING_TEXT : winningOption.text;
    const finalWinner = { ...winningOption, text: finalText };

    setWinner(finalWinner);
    setIsLosingResult(losingHit);

    if (losingHit) {
      sounds.playLose();
      sounds.playCrowdOhNo();
      setFlamingoReactionMode("lose");
      setShowLoseSticker(true);
      window.setTimeout(() => setShowLoseSticker(false), RESULT_MESSAGE_DURATION_MS);
      window.setTimeout(() => setFlamingoReactionMode("idle"), RESULT_MESSAGE_DURATION_MS);
    } else {
      sounds.playWin();
      setFlamingoReactionMode("win");
      window.setTimeout(() => setFlamingoReactionMode("idle"), RESULT_MESSAGE_DURATION_MS);
    }

    setIsWinnerOpen(true);
    setIsSpinning(false);

    // Active confetti if allowed
    if (config.showConfetti) {
      setConfettiActive(true);
    }

    // Save result to History list (prepend)
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const newResult: SpinResult = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      optionText: finalText,
      timestamp: timeFormatted,
    };

    const newHistory = [newResult, ...results];
    setResults(newHistory);
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(newHistory));

    void recordSpinHistory({
      resultText: finalText,
      isLosing: losingHit,
      linkToken: accessToken,
      wheelOptionId: winningOption.id,
      spunAt: now.toISOString(),
    });

    if (!losingHit) {
      let depletedPrize: string | null = null;
      setOptions((prev) => {
        const updated = prev.map((opt) => {
          if (opt.id !== winningOption.id) return opt;
          if (opt.stock === null) return opt;

          const nextStock = Math.max(0, opt.stock - 1);
          if (nextStock === 0) depletedPrize = opt.text;

          return {
            ...opt,
            stock: nextStock,
            enabled: nextStock > 0,
          };
        });

        localStorage.setItem(LOCAL_STORAGE_OPTIONS_KEY, JSON.stringify(updated));
        return updated;
      });

      if (depletedPrize) {
        showToast(`Se agotó el premio: ${depletedPrize}`, "info");
      }
    }

    // Capture user prize choice if registered
    if (currentParticipant) {
      const updatedP = { ...currentParticipant, wonPrize: winningOption.text };
      setCurrentParticipant(updatedP);
      const updatedList = participants.map((p) =>
        p.id === currentParticipant.id ? updatedP : p
      );
      setParticipants(updatedList);
      localStorage.setItem(LOCAL_STORAGE_PARTICIPANTS_KEY, JSON.stringify(updatedList));
      if (losingHit) {
        showToast(`${LOSING_TEXT}`, "info", RESULT_MESSAGE_DURATION_MS);
      } else {
        showToast(`¡Felicitaciones ${currentParticipant.fullName}, has ganado: ${finalText}!`, "success", RESULT_MESSAGE_DURATION_MS);
      }
      consumeOneTimeLink(finalText, currentParticipant.fullName);
    } else {
      showToast(`Resultado del giro: ${finalText}`, losingHit ? "info" : "success", RESULT_MESSAGE_DURATION_MS);
      consumeOneTimeLink(finalText);
    }
  };

  // 5. Deletion/Restore callbacks from lists
  const handleRemoveWinnerFromWheel = (id: string) => {
    const updated = options.filter((o) => o.id !== id);
    // Maintain original colors where available, or re-apply colors
    const rawTexts = updated.map((o) => o.text);
    const reColored = applyColors(rawTexts, config.theme);
    const mergeState = reColored.map((rc, idx) => ({
      ...rc,
      enabled: updated[idx]?.enabled !== false,
      stock: updated[idx]?.stock ?? null,
    }));

    handleSaveOptions(mergeState);
    setIsWinnerOpen(false);
  };

  const handleRestoreOption = (text: string) => {
    // If the option physically exists in the current wheel, enable it if it's disabled.
    const exactMatch = options.find((o) => o.text.trim().toLowerCase() === text.trim().toLowerCase());
    
    if (exactMatch) {
      if (!exactMatch.enabled) {
        const updated = options.map((o) =>
          o.id === exactMatch.id ? { ...o, enabled: true } : o
        );
        handleSaveOptions(updated);
      }
    } else {
      // Create new option
      const palette = THEMES[config.theme]?.colors || THEMES.rainbow.colors;
      const nextIdx = options.length;
      const color = palette[nextIdx % palette.length];

      const newOption: WheelOption = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text: text,
        color,
        enabled: true,
        stock: null,
      };
      handleSaveOptions([...options, newOption]);
    }
  };

  const clearHistory = () => {
    if (window.confirm("¿Seguro que quieres eliminar todo el historial?")) {
      setResults([]);
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
    }
  };

  // Close modals
  const handleCloseModalSplendidly = () => {
    setIsWinnerOpen(false);

    // Apply auto deletion if the configuration allows it: "removeAfterWinner"
    if (config.removeAfterWinner && winner) {
      handleRemoveWinnerFromWheel(winner.id);
    }

    if (spinAccessLocked || linkConsumed) {
      setCurrentParticipant(null);
      setIsAdminMode(false);
      setLinkAccessState("used");
      showToast("Giro finalizado. Este link ya fue usado y necesitas uno nuevo.", "info", RESULT_MESSAGE_DURATION_MS);
      return;
    }

    if (currentParticipant) {
      showToast("Resultado registrado. Puedes copiar el link o girar de nuevo sin salir de esta pantalla.", "info", RESULT_MESSAGE_DURATION_MS);
    }
  };

  const handleRegisterParticipant = (newP: Participant) => {
    setIsAdminMode(false);
    setLinkConsumed(false);
    setSpinAccessLocked(false);

    if (!options.some((o) => isLosingOptionText(o.text))) {
      const palette = THEMES[config.theme]?.colors || THEMES.rainbow.colors;
      const loseColor = palette[options.length % palette.length];
      const loseOption: WheelOption = {
        id: `lose-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text: LOSING_TEXT,
        color: loseColor,
        enabled: true,
        stock: null,
      };
      handleSaveOptions([...options, loseOption]);
    }

    const updated = [newP, ...participants];
    setParticipants(updated);
    localStorage.setItem(LOCAL_STORAGE_PARTICIPANTS_KEY, JSON.stringify(updated));
    setCurrentParticipant(newP);
  };

  const handleClearAllParticipants = () => {
    setParticipants([]);
    localStorage.removeItem(LOCAL_STORAGE_PARTICIPANTS_KEY);
  };

  const handleRemoveParticipant = (id: string) => {
    const updated = participants.filter((p) => p.id !== id);
    setParticipants(updated);
    localStorage.setItem(LOCAL_STORAGE_PARTICIPANTS_KEY, JSON.stringify(updated));
  };

  // If there's no current registered player and we are not in admin override, show the welcome cover registration
  if (!currentParticipant && (Boolean(accessToken) || !isAdminMode)) {
    const renderAdminBypass = (
      <div id="admin-bypass-bar" className="bg-slate-950/90 border-t border-slate-800 py-4 text-center z-20">
        <button
          id="bypass-admin-btn"
          onClick={requestAdminAccess}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <Key className="h-3.5 w-3.5 text-indigo-500" />
          Acceso Administrador (Configurar opciones / Ver registros)
        </button>
      </div>
    );

    if (linkAccessState === "checking") {
      return (
        <div id="link-check-view" className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center text-slate-100">
          <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
            <h2 className="text-lg font-black text-white">Validando enlace único...</h2>
            <p className="mt-2 text-sm text-slate-300">Espera un momento mientras verificamos el acceso.</p>
          </div>
        </div>
      );
    }

    if (linkAccessState === "missing" || linkAccessState === "invalid") {
      return (
        <div id="invalid-link-view" className="flex flex-col min-h-screen justify-between bg-slate-900 text-slate-100">
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div className="max-w-lg rounded-2xl border border-rose-700/40 bg-rose-950/30 p-7">
              <h2 className="text-xl font-black text-rose-200">Enlace no válido</h2>
              <p className="mt-2 text-sm text-rose-100/90">
                Este enlace no existe o no fue generado por el sistema. Solicita un enlace nuevo al administrador.
              </p>
            </div>
          </div>
          {renderAdminBypass}
        </div>
      );
    }

    if (linkAccessState === "used") {
      return (
        <div id="used-link-view" className="flex flex-col min-h-screen justify-between bg-slate-900 text-slate-100">
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div className="max-w-lg rounded-2xl border border-amber-600/40 bg-amber-950/25 p-7">
              <h2 className="text-xl font-black text-amber-200">Este enlace ya fue usado</h2>
              <p className="mt-2 text-sm text-amber-100/90">
                Por seguridad, cada enlace permite solo un giro. Si necesitas participar otra vez, solicita un enlace nuevo.
              </p>
            </div>
          </div>
          {renderAdminBypass}
        </div>
      );
    }

    if (linkAccessState === "expired") {
      return (
        <div id="expired-link-view" className="flex flex-col min-h-screen justify-between bg-slate-900 text-slate-100">
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div className="max-w-lg rounded-2xl border border-orange-600/40 bg-orange-950/25 p-7">
              <h2 className="text-xl font-black text-orange-200">Este enlace expiró</h2>
              <p className="mt-2 text-sm text-orange-100/90">
                El tiempo de validez terminó. Solicita un enlace nuevo al administrador para participar.
              </p>
            </div>
          </div>
          {renderAdminBypass}
        </div>
      );
    }

    return (
      <div id="registration-view" className="flex flex-col min-h-screen justify-between bg-slate-900">
        <RegistrationPortal onRegister={handleRegisterParticipant} />
        {renderAdminBypass}
      </div>
    );
  }

  return (
    <div
      id="app-container"
      className={`min-h-screen text-slate-800 antialiased flex flex-col justify-between relative overflow-hidden ${
        isAdminMode ? "bg-slate-100" : ""
      }`}
    >
      {/* Dreamy animated pastel rainbow background with starry clouds and floating feathers */}
      {!isAdminMode && <FloatingDecorations />}

      {/* Dynamic Celebration Confetti */}
      <ConfettiCanvas
        active={confettiActive}
        onComplete={() => setConfettiActive(false)}
      />

      {/* Modern, clean styled navigation/header with glassmorphism */}
      <header
        id="app-header"
        className="sticky top-0 z-30 border-b border-slate-200/50 bg-white/75 backdrop-blur-md px-6 py-4"
      >
        <div id="header-wrapper" className="mx-auto flex max-w-7xl items-center justify-between relative z-10">
          <div id="header-brand" className="flex items-center gap-3">
            <div id="logo-icon-container" className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 p-0.5 shadow-md transform hover:scale-110 transition-transform">
              <img 
                src={prideFlamingo} 
                alt="Logo Ruleta Pride 2" 
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover rounded-lg bg-slate-900"
              />
            </div>
            <div>
              <h1 id="app-title-header" className="font-sans text-xl font-black tracking-tight text-slate-950 leading-none">
                Ruleta Pride 2
              </h1>
              <p id="app-subtitle-header" className="text-[9px] uppercase font-bold tracking-widest text-indigo-700 mt-1">
                Casa Smoke y Arte <span className="text-pink-500 font-extrabold">OT SSOT S.A.S</span>
              </p>
            </div>
          </div>

          {/* Controls: Sound options & Beautiful Share Button */}
          <div id="header-controls-wrapper" className="flex items-center gap-3">
            <button
              id="header-sound-quick-toggle"
              type="button"
              title="Alternar sonido"
              onClick={() => handleSaveConfig({ ...config, soundEnabled: !config.soundEnabled })}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                config.soundEnabled
                  ? "border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {config.soundEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sonido: Activado</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sonido: Silenciado</span>
                </>
              )}
            </button>

            <button
              id="header-share-btn"
              onClick={handleShare}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                copied
                  ? "bg-emerald-600 text-white scale-105"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {copied ? "¡Enlace Copiado!" : "Compartir"}
            </button>
          </div>
        </div>
      </header>

      {/* Main workspace layout */}
      <main id="app-main-content" className="relative z-20 mx-auto w-full max-w-7xl flex-1 px-4 py-8 lg:px-6">
        
        {/* Active participant banner if present */}
        {currentParticipant && (
          <div id="active-player-banner" className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white rounded-2xl p-4.5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 bg-white/10 rounded-xl flex items-center justify-center font-bold text-lg select-none">
                👤
              </div>
              <div>
                <div className="text-[10px] text-indigo-200 font-extrabold uppercase tracking-widest">Jugando Ahora</div>
                <h4 className="font-sans text-base font-black tracking-tight">{currentParticipant.fullName}</h4>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 z-10">
              <span className="text-[11px] font-bold text-indigo-100 bg-white/10 px-2.5 py-1 rounded-lg">
                📞 {currentParticipant.phone}
              </span>
              <button
                id="exit-game-banner"
                onClick={() => {
                  if (window.confirm("¿Deseas finalizar la sesión del jugador actual? Regresará al portal de registro.")) {
                    setCurrentParticipant(null);
                    setIsAdminMode(false);
                    showToast("Sesión finalizada", "info");
                  }
                }}
                className="text-xs bg-white text-indigo-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg font-bold transition active:scale-95 cursor-pointer outline-none"
              >
                Cambiar Jugador
              </button>
            </div>
          </div>
        )}

        {/* If in admin override mode and no active player, show a header banner */}
        {isAdminMode && !currentParticipant && (
          <div id="admin-mode-banner" className="bg-slate-950 border border-slate-800 text-slate-100 rounded-2xl p-4.5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-lg text-indigo-500 select-none font-sans">
                ⚙️
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Panel Administrativo</div>
                <h4 className="font-sans text-sm font-bold tracking-tight">Consola de Control (Registro inactivo)</h4>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                id="create-single-use-link-btn"
                onClick={createOneTimeLink}
                disabled={creatingLink}
                className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg font-bold transition active:scale-95 cursor-pointer outline-none z-10 disabled:opacity-60"
              >
                <Link2 className="h-3.5 w-3.5" />
                {creatingLink ? "Generando..." : "Generar Link de 1 Uso"}
              </button>

              {lastGeneratedLink && (
                <button
                  id="copy-last-generated-link-btn"
                  onClick={() => copyLinkIfStillActive(lastGeneratedLink, "Último link")}
                  className="text-[11px] text-emerald-200 underline underline-offset-2 hover:text-white"
                  title={lastGeneratedLink}
                >
                  Copiar último link generado
                </button>
              )}

              <button
                id="exit-admin-banner"
                onClick={handleAdminLogout}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg font-bold transition active:scale-95 cursor-pointer outline-none z-10"
              >
                🔒 Volver a Pantalla de Registro
              </button>
            </div>
          </div>
        )}

        {isAdminMode && !currentParticipant && (
          <div id="link-audit-panel" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-800">Auditoría de Links (1 solo uso)</h3>
              <button
                id="refresh-link-audit-btn"
                onClick={fetchLinkAudit}
                disabled={loadingAudit}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingAudit ? "animate-spin" : ""}`} />
                Actualizar
              </button>
            </div>

            {linkAudit.length === 0 ? (
              <p className="text-xs text-slate-500">No hay links generados todavía.</p>
            ) : (
              <div className="max-h-64 overflow-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Token</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Creado</th>
                      <th className="px-3 py-2">Expira</th>
                      <th className="px-3 py-2">Resultado</th>
                      <th className="px-3 py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkAudit.map((item) => (
                      <tr key={item.token} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{item.token.slice(0, 10)}...</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              item.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : item.status === "used"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{new Date(item.createdAt).toLocaleString("es-ES")}</td>
                        <td className="px-3 py-2 text-slate-600">{new Date(item.expiresAt).toLocaleString("es-ES")}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {item.resultText ? `${item.resultText}${item.participantName ? ` (${item.participantName})` : ""}` : "-"}
                        </td>
                        <td className="px-3 py-2">
                          {item.status === "active" ? (
                            <button
                              type="button"
                              onClick={() => copyLinkIfStillActive(buildRegistrationLink(item.token), "Link activo")}
                              className="rounded-md border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              Copiar
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">No copiable</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div 
          id="grid-layout" 
          className={
            (currentParticipant && !isAdminMode)
              ? "max-w-xl mx-auto w-full flex flex-col items-center justify-center py-4"
              : "grid grid-cols-1 gap-8 lg:grid-cols-12 items-start"
          }
        >
          
          {/* LEFT PANEL: The Spinning Wheel Arena (occupies 5 columns or full width if client) */}
          <div 
            id="wheel-arena-column" 
            className={
              (currentParticipant && !isAdminMode)
                ? "w-full flex flex-col justify-center select-none"
                : "lg:col-span-6 xl:col-span-5 flex flex-col justify-center"
            }
          >
            <div id="wheel-card-wrapper" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div id="wheel-card-header" className="mb-4 text-center">
                <span id="wheel-badge" className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                  <Sparkles className="h-2.5 w-2.5 text-indigo-600 animate-pulse" />
                  Sorteador Virtual
                </span>
                <p id="wheel-desc" className="mt-1 text-xs text-slate-400">
                  Haz clic sobre el círculo, el botón central o el gran activador inferior para girar
                </p>
              </div>
 
              {/* Core wheel integration */}
              <div className={`flex w-full items-start gap-4 ${currentParticipant && !isAdminMode ? "flex-col md:flex-row" : "flex-col"}`}>
                <div className="flex-1">
                  <Wheel
                    options={options}
                    config={config}
                    onSpinStart={handleSpinStart}
                    onSpinComplete={handleSpinComplete}
                    isSpinning={isSpinning || spinAccessLocked || linkConsumed}
                  />
                </div>

                {currentParticipant && !isAdminMode && (
                  <FlamingoCompanion
                    isSpinning={isSpinning}
                    hasResult={Boolean(winner)}
                    isLosingResult={isLosingResult}
                    reactionMode={flamingoReactionMode}
                  />
                )}

                {currentParticipant && !isAdminMode && showLoseSticker && (
                  <div className="pointer-events-none absolute inset-x-0 top-6 z-30 flex justify-center">
                    <div className="animate-lose-sticker rounded-2xl border-2 border-rose-200 bg-rose-600 px-4 py-2 text-center text-sm font-black uppercase tracking-wider text-white shadow-xl">
                      Perdio Veci que pena
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
 
           {/* RIGHT PANEL: Options editing and settings (occupies 7 columns) - HIDDEN for clients */}
           {(!currentParticipant || isAdminMode) && (
             <div id="controls-panel-column" className="lg:col-span-6 xl:col-span-7 space-y-6">
               
               {/* Tabbed workspace headers */}
               <div id="navigation-tabs" className="flex rounded-xl bg-white p-1.5 shadow-sm border border-slate-200">
                 <button
                   id="tab-btn-options"
                   onClick={() => { if (!isSpinning) setActiveTab2("options"); }}
                   disabled={isSpinning}
                   className={`flex-1 rounded-lg py-3 text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                     activeTab === "options"
                       ? "bg-indigo-600 text-white shadow-sm"
                       : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
                   }`}
                 >
                   📝 Opciones ({options.length})
                 </button>
                 <button
                   id="tab-btn-participants"
                   onClick={() => { if (!isSpinning) setActiveTab2("participants"); }}
                   disabled={isSpinning}
                   className={"flex-1 rounded-lg py-3 px-2 text-sm font-semibold tracking-wide transition-all cursor-pointer " + (activeTab === "participants" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40")}
                 >
                   👥 Clientes ({participants.length})
                 </button>
                 <button
                   id="tab-btn-config"
                   onClick={() => { if (!isSpinning) setActiveTab2("config"); }}
                   disabled={isSpinning}
                   className={`flex-1 rounded-lg py-3 text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                     activeTab === "config"
                       ? "bg-indigo-600 text-white shadow-sm"
                       : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
                   }`}
                 >
                   ⚙️ Ajustes
                 </button>
                 <button
                   id="tab-btn-history"
                   onClick={() => { if (!isSpinning) setActiveTab2("history"); }}
                   disabled={isSpinning}
                   className={`flex-1 rounded-lg py-3 text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                     activeTab === "history"
                       ? "bg-indigo-600 text-white shadow-sm"
                       : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
                   }`}
                 >
                   🏆 Historial ({results.length})
                 </button>
               </div>

              {/* TAB BODY: Options list or configurations or records history */}
              <div id="tab-viewport" className="transition-all duration-300">
                {activeTab === "options" && (
                  <OptionsEditor
                    options={options}
                    onOptionsChange={handleSaveOptions}
                    configTheme={config.theme}
                    isSpinning={isSpinning}
                  />
                )}

                {activeTab === "participants" && (
                  <ParticipantsList
                    participants={participants}
                    onClearAll={handleClearAllParticipants}
                    onRemoveParticipant={handleRemoveParticipant}
                    onShowToast={showToast}
                  />
                )}

                {activeTab === "config" && (
                  <ConfigPanel
                    config={config}
                    onConfigChange={handleSaveConfig}
                    isSpinning={isSpinning}
                    onThemeChanged={handleThemeColorReapply}
                    participants={participants}
                  />
                )}

                {activeTab === "history" && (
                  <HistoryList
                    results={results}
                    onClearHistory={clearHistory}
                    onRestoreOption={handleRestoreOption}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: Ideas, uses, education templates - HIDDEN for clients */}
        {(!currentParticipant || isAdminMode) && (
          <section id="use-cases-ideas" className="mt-12 rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <button
              id="toggle-ideas-btn"
              onClick={() => setShowIdeas(!showIdeas)}
              className="flex w-full items-center justify-between text-left outline-none cursor-pointer"
            >
            <div id="ideas-title-wrapper" className="flex items-center gap-2.5">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <div>
                <h3 id="ideas-heading" className="font-sans text-base font-bold text-slate-800">
                  💡 Ideas sobre cuándo usar la Ruleta Virtual
                </h3>
                <p id="ideas-subheading" className="text-xs text-slate-400">Descubre cómo sacarle el máximo provecho en el trabajo, colegio o con amigos.</p>
              </div>
            </div>
            <span id="ideas-toggle-icon" className="font-mono text-sm font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
              {showIdeas ? "Ocultar" : "Mostrar"}
            </span>
          </button>

          {showIdeas && (
            <div id="ideas-details-grid" className="mt-6 grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2 md:grid-cols-3">
              <div id="idea-card-school" className="space-y-1.5 p-3 rounded-2xl bg-slate-50/50">
                <span id="idea-school-emoji" className="text-xl">👩‍🏫</span>
                <h4 id="idea-school-title" className="font-sans text-sm font-bold text-slate-800">Profesores y Colegios</h4>
                <p id="idea-school-body" className="text-xs text-slate-500 leading-relaxed text-balance">
                  Elige qué estudiante debe pasar el pizarrón, dar la exposición del día, o responde preguntas interactivas. Todos tienen la misma probabilidad de participar.
                </p>
              </div>

              <div id="idea-card-office" className="space-y-1.5 p-3 rounded-2xl bg-slate-50/50">
                <span id="idea-office-emoji" className="text-xl">💼</span>
                <h4 id="idea-office-title" className="font-sans text-sm font-bold text-slate-800">En el Trabajo y Oficinas</h4>
                <p id="idea-office-body" className="text-xs text-slate-500 leading-relaxed text-balance">
                  Como Project Manager, escoge al azar quién será el próximo en dar su stand-up diario o reporte, o decide democráticamente a quién le toca preparar el café del equipo.
                </p>
              </div>

              <div id="idea-card-home" className="space-y-1.5 p-3 rounded-2xl bg-slate-50/50">
                <span id="idea-home-emoji" className="text-xl">🏠</span>
                <h4 id="idea-home-title" className="font-sans text-sm font-bold text-slate-800">Decisiones con Amigos o Familia</h4>
                <p id="idea-home-body" className="text-xs text-slate-500 leading-relaxed text-balance">
                  Toma divertidas decisiones en el hogar: decide a quién le toca lavar los platos, cocinar la cena, pasear al perro, o de quién será la casa para la siguiente reunión.
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </main>

      {/* Persistent modal celebratory display */}
      <WinnerModal
        winner={winner}
        isOpen={isWinnerOpen}
        onClose={handleCloseModalSplendidly}
        onRemoveWinner={handleRemoveWinnerFromWheel}
      />

      {/* Tiny footer credit */}
      <footer id="app-footer" className="relative z-20 mt-12 border-t border-slate-200/60 bg-white py-6 text-center text-xs text-slate-400">
        <p id="footer-copyright-text" className="flex items-center justify-center gap-1">
          Hecho con <Heart className="h-3 w-3 text-red-400 fill-red-400" /> Casa Smoke y Arte OT Premios • 2026
        </p>
      </footer>
    </div>
  );
}
