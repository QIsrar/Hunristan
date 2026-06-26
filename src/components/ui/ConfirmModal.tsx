"use client";
import { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, X, CheckCircle2, Info } from "lucide-react";

type ModalVariant = "danger" | "warning" | "info" | "success";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ModalVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIG = {
  danger:  { icon: Trash2,         iconBg: "bg-red-500/10",    iconColor: "text-red-400",    btn: "bg-red-500 hover:bg-red-600 text-white" },
  warning: { icon: AlertTriangle,  iconBg: "bg-amber-500/10",  iconColor: "text-amber-400",  btn: "bg-amber-500 hover:bg-amber-600 text-bg" },
  info:    { icon: Info,           iconBg: "bg-accent/10",     iconColor: "text-accent",     btn: "bg-accent hover:bg-accent/80 text-bg" },
  success: { icon: CheckCircle2,   iconBg: "bg-green-500/10",  iconColor: "text-green-400",  btn: "bg-green-500 hover:bg-green-600 text-bg" },
};

export default function ConfirmModal({
  open, title, message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm, onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const { icon: Icon, iconBg, iconColor, btn } = VARIANT_CONFIG[variant];

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  // Focus confirm button on open
  useEffect(() => {
    if (open) setTimeout(() => confirmRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative glass rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up border border-border">
        {/* Close X */}
        <button onClick={onCancel} className="absolute top-4 right-4 text-muted hover:text-text transition-colors">
          <X size={16} />
        </button>

        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
          <Icon size={22} className={iconColor} />
        </div>

        {/* Content */}
        <h3 className="font-display text-lg font-bold mb-2">{title}</h3>
        <p className="text-muted text-sm leading-relaxed mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted hover:text-text hover:border-border/80 transition-colors">
            {cancelLabel}
          </button>
          <button ref={confirmRef} onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${btn}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}