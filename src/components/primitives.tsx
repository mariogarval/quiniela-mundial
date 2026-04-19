"use client";
import React from "react";

export function Card({
  children, className = "", glow = false,
}: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div
      className={[
        "bg-surface rounded-2xl overflow-hidden",
        glow ? "border border-borderHi shadow-[0_0_24px_rgba(0,230,118,0.25)]" : "border border-border shadow-[0_2px_12px_rgba(0,0,0,0.4)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function Btn({
  children, variant = "primary", onClick, className = "", type = "button", disabled,
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "gradient" | "whatsapp";
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base = "btn-press w-full h-[52px] rounded-[14px] font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none";
  const variants = {
    primary: "bg-brand-green text-black",
    outline: "border border-brand-green text-brand-green bg-transparent",
    gradient: "bg-gradient-to-br from-brand-green to-brand-cyan text-black shadow-[0_8px_24px_rgba(0,230,118,0.25)]",
    whatsapp: "bg-[#25D366] text-black h-[54px] rounded-2xl",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={[base, variants[variant], className].join(" ")}>
      {children}
    </button>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="px-4 pt-3 pb-1">
      <div className="flex justify-between mb-2">
        <span className="font-sans text-xs text-textMuted">{label}</span>
        <span className="font-sans text-xs font-semibold text-brand-green">{value}/{max}</span>
      </div>
      <div className="h-1 rounded bg-white/10">
        <div className="h-full rounded bg-gradient-to-r from-brand-green to-brand-cyan transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ScoreInput({
  value, onChange, locked,
}: { value: string; onChange: (v: string) => void; locked?: boolean }) {
  const filled = value !== "" && value != null;
  return (
    <div
      className={[
        "w-11 h-12 rounded-xl flex items-center justify-center transition-colors",
        "bg-surface2",
        filled ? "border-[1.5px] border-brand-green" : "border-[1.5px] border-border",
      ].join(" ")}
    >
      <input
        className="score-input"
        type="number" min={0} max={20}
        value={value}
        disabled={locked}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" || /^\d{1,2}$/.test(v)) onChange(v);
        }}
        placeholder="0"
        style={{ color: filled ? "#fff" : "rgba(255,255,255,0.28)" }}
      />
    </div>
  );
}

export function Flag({ emoji, size = 22 }: { emoji: string; size?: number }) {
  return <span style={{ fontSize: size, lineHeight: 1 }}>{emoji}</span>;
}

export function Pill({
  children, active = false, tone = "green",
}: { children: React.ReactNode; active?: boolean; tone?: "green" | "amber" | "muted" }) {
  const toneMap = {
    green: active ? "bg-brand-greenDim text-brand-green border-brand-green" : "bg-white/5 text-textMuted border-border",
    amber: "bg-amberDim text-amber border-amber",
    muted: "bg-white/5 text-textMuted border-border",
  };
  return (
    <span className={["inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold border", toneMap[tone]].join(" ")}>
      {children}
    </span>
  );
}
