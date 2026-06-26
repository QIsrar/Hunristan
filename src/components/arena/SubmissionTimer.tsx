"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface Props {
  /** Total time limit in minutes */
  timeLimitMinutes: number;
  /**
   * Unix timestamp (ms) when the session started.
   * Passed as a stable value so the timer survives re-renders.
   */
  startedAt: number;
  /** Called once when the countdown reaches 0 */
  onTimeUp: () => void;
}

/**
 * SubmissionTimer
 * Countdown timer for timed categories (MCQ, timed CODE).
 * - Displays MM:SS (H:MM:SS for > 60 min)
 * - Turns amber at 20% remaining
 * - Turns red and pulses at 10% remaining
 * - Calls `onTimeUp` exactly once when the clock hits 0
 */
export default function SubmissionTimer({ timeLimitMinutes, startedAt, onTimeUp }: Props) {
  const totalMs = timeLimitMinutes * 60 * 1000;
  const fired = useRef(false);

  const getRemainingMs = useCallback(() => {
    return Math.max(0, startedAt + totalMs - Date.now());
  }, [startedAt, totalMs]);

  const [remainingMs, setRemainingMs] = useState(getRemainingMs);

  useEffect(() => {
    fired.current = false;
    setRemainingMs(getRemainingMs());

    const iv = setInterval(() => {
      const ms = getRemainingMs();
      setRemainingMs(ms);
      if (ms <= 0 && !fired.current) {
        fired.current = true;
        clearInterval(iv);
        onTimeUp();
      }
    }, 500);

    return () => clearInterval(iv);
  }, [startedAt, totalMs, onTimeUp, getRemainingMs]);

  const pct = totalMs > 0 ? remainingMs / totalMs : 0;

  const totalSec = Math.ceil(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const display = h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  const isUrgent = pct <= 0.1;
  const isWarning = pct <= 0.2 && !isUrgent;

  const colorClass = isUrgent
    ? "text-red-400 border-red-500/40 bg-red-500/10"
    : isWarning
      ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
      : "text-accent border-accent/20 bg-accent/5";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono font-bold transition-all duration-300 ${colorClass} ${isUrgent ? "animate-pulse" : ""}`}
      title={`${timeLimitMinutes}-minute time limit`}
    >
      {isUrgent
        ? <AlertTriangle size={13} className="shrink-0" />
        : <Clock size={13} className="shrink-0" />}
      <span>{display}</span>
    </div>
  );
}
