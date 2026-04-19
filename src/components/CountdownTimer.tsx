"use client";
import { useEffect, useState } from "react";

export function CountdownTimer({ targetIso }: { targetIso: string }) {
  const [diff, setDiff] = useState<ReturnType<typeof computeDiff> | null>(null);

  useEffect(() => {
    setDiff(computeDiff(targetIso));
    const id = setInterval(() => setDiff(computeDiff(targetIso)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!diff) return (
    <div className="px-4">
      <div className="flex gap-1.5 items-start">
        {["días","horas","min","seg"].map(l => <Unit key={l} val={0} label={l} />)}
      </div>
    </div>
  );

  const locked = diff.total <= 0;

  return (
    <div className="px-4">
      <div className="flex gap-1.5 items-start">
        <Unit val={locked ? 0 : diff.d} label="días" />
        <Sep />
        <Unit val={locked ? 0 : diff.h} label="horas" />
        <Sep />
        <Unit val={locked ? 0 : diff.m} label="min" />
        <Sep />
        <Unit val={locked ? 0 : diff.s} label="seg" />
      </div>
      {locked && (
        <div className="mt-3 text-center text-danger font-sans text-xs uppercase tracking-widest">
          Predicciones cerradas
        </div>
      )}
    </div>
  );
}

function Unit({ val, label }: { val: number; label: string }) {
  return (
    <div className="flex flex-col items-center flex-1">
      <div className="w-full text-center rounded-[10px] bg-surface2 border border-border py-2">
        <span className="font-display text-4xl font-extrabold tracking-tight text-white">
          {String(val).padStart(2, "0")}
        </span>
      </div>
      <span className="mt-1 text-[10px] tracking-widest uppercase text-textMuted">{label}</span>
    </div>
  );
}

function Sep() {
  return <span className="pt-1.5 text-4xl font-bold text-brand-green font-display">:</span>;
}

function computeDiff(targetIso: string) {
  const total = Math.max(0, new Date(targetIso).getTime() - Date.now());
  const s = Math.floor(total / 1000);
  return {
    total,
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}
