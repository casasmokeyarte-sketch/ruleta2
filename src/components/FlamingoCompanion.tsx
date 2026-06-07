import prideFlamingo from "../assets/images/pride_flamingo_1780378704946.png";

interface FlamingoCompanionProps {
  isSpinning: boolean;
  hasResult: boolean;
  isLosingResult: boolean;
  reactionMode: "idle" | "win" | "lose";
}

export default function FlamingoCompanion({
  isSpinning,
  hasResult,
  isLosingResult,
  reactionMode,
}: FlamingoCompanionProps) {
  const moodText = isSpinning
    ? "Dale veci, tú puedes!"
    : hasResult
    ? isLosingResult
      ? "Perdio Veci que pena"
      : "Esooo veci, ganaste!"
    : "Estoy aqui animandote!";

  const moodEmoji = isSpinning
    ? "✨"
    : hasResult
    ? isLosingResult
      ? "😢"
      : "🎉"
    : "😎";

  const moodClass = isSpinning
    ? "animate-pulse"
    : reactionMode === "win"
    ? "animate-flamingo-dance"
    : reactionMode === "lose"
    ? "animate-flamingo-sad grayscale-[75%] saturate-50"
    : hasResult
    ? isLosingResult
      ? "grayscale-[70%] saturate-50"
      : "animate-bounce"
    : "animate-logo-float";

  return (
    <aside
      id="flamingo-companion"
      className="w-full max-w-[220px] rounded-2xl border border-slate-200 bg-white/95 p-3 text-center shadow-sm"
    >
      <div className="relative mx-auto mb-2 h-28 w-28">
        <div className={`absolute inset-0 rounded-full ${isLosingResult && hasResult ? "bg-slate-300/50" : "bg-pink-400/20"} blur-xl`} />
        <img
          src={prideFlamingo}
          alt="Flamingo animador"
          referrerPolicy="no-referrer"
          className={`relative z-10 h-full w-full rounded-full border-4 border-white object-cover ${moodClass}`}
        />
        {(hasResult && isLosingResult) || reactionMode === "lose" ? (
          <span className="absolute right-1 top-8 z-20 text-xl animate-bounce">💧</span>
        ) : null}
      </div>

      <p className={`text-xs font-black ${isLosingResult && hasResult ? "text-slate-700" : "text-indigo-700"}`}>
        {moodEmoji} {moodText}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Tu Flamingo Coqueto
      </p>
    </aside>
  );
}
