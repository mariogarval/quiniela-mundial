"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Btn } from "./primitives";
import { getMemberships, activateMembership, setMemberships, type Membership } from "@/lib/session";

type Mode = "idle" | "login" | "results";

export function LandingClient() {
  const router = useRouter();
  const [memberships, setMembershipsState] = useState<Membership[]>([]);
  const [mode, setMode] = useState<Mode>("idle");
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMembershipsState(getMemberships());
    setHydrated(true);
  }, []);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/account?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!data.memberships.length) { setError("No encontramos quinielas con ese email."); setLoading(false); return; }
      // Merge incoming memberships with existing ones in a single write
      const existing = getMemberships();
      const incoming: Membership[] = data.memberships;
      const merged = [
        ...existing.filter((x) => !incoming.some((m) => m.poolId === x.poolId)),
        ...incoming,
      ];
      setMemberships(merged);
      setMembershipsState(merged);
      setFound(incoming);
      setMode("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar");
    } finally { setLoading(false); }
  };

  const enter = (m: Membership) => {
    activateMembership(m);
    router.push(`/pool/${m.poolId}`);
  };

  if (!hydrated) return null;

  // ── Returning user: has pools in localStorage ──
  if (memberships.length > 0 && mode === "idle") {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-base font-bold uppercase tracking-wide">Tus Quinielas</span>
          <Link href="/pool/join" className="text-xs text-brand-green">+ Unirme a otra</Link>
        </div>
        <div className="flex flex-col gap-2">
          {memberships.map((m) => (
            <PoolEntryButton key={m.poolId} m={m} onEnter={enter} />
          ))}
        </div>
      </div>
    );
  }

  // ── Email lookup form ──
  if (mode === "login") {
    return (
      <div className="mt-6">
        <button onClick={() => setMode("idle")} className="text-xs text-textMuted mb-4 inline-block">← Volver</button>
        <h2 className="font-display text-xl font-bold mb-1">Entrar con tu email</h2>
        <p className="text-sm text-textMuted mb-4">Buscamos todas las quinielas asociadas a tu correo.</p>
        <form onSubmit={lookup} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full h-12 px-4 rounded-xl bg-surface2 border border-border focus:border-brand-green outline-none text-white"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <Btn variant="gradient" type="submit" disabled={loading}>
            {loading ? "Buscando…" : "Buscar mis quinielas"}
          </Btn>
        </form>
      </div>
    );
  }

  // ── Results after email lookup ──
  if (mode === "results") {
    return (
      <div className="mt-6">
        <button onClick={() => { setMode("login"); setFound([]); }} className="text-xs text-textMuted mb-4 inline-block">← Volver</button>
        <h2 className="font-display text-xl font-bold mb-1">Tus Quinielas</h2>
        <p className="text-sm text-textMuted mb-4">Selecciona a cuál quieres entrar.</p>
        <div className="flex flex-col gap-2">
          {found.map((m) => (
            <PoolEntryButton key={m.poolId} m={m} onEnter={enter} />
          ))}
        </div>
      </div>
    );
  }

  // ── New user: no memberships ──
  return (
    <div className="mt-4 text-center">
      <button
        onClick={() => setMode("login")}
        className="text-xs text-textMuted underline underline-offset-2"
      >
        ¿Ya tienes cuenta? Entra con tu email
      </button>
    </div>
  );
}

function PoolEntryButton({ m, onEnter }: { m: Membership; onEnter: (m: Membership) => void }) {
  return (
    <button
      onClick={() => onEnter(m)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface border border-border hover:border-brand-green/60 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-brand-greenDim border border-brand-green flex items-center justify-center font-display font-bold text-brand-green text-sm shrink-0">
        {m.poolName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{m.poolName}</div>
        <div className="text-[11px] text-textMuted truncate">{m.userName}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M9 18l6-6-6-6" stroke="#00E676" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
