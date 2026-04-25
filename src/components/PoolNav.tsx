"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = (base: string) => [
  { id: "home",    label: "Quiniela", href: base,              match: (p: string) => p === base },
  { id: "grupos",  label: "Grupos",   href: `${base}/grupos`,  match: (p: string) => p.startsWith(`${base}/grupos`) },
  { id: "ranking", label: "Ranking",  href: `${base}/ranking`, match: (p: string) => p.startsWith(`${base}/ranking`) },
  { id: "perfil",  label: "Perfil",   href: `${base}/perfil`,  match: (p: string) => p.startsWith(`${base}/perfil`) },
];

export function PoolNav({ poolId }: { poolId: string }) {
  const pathname = usePathname() ?? "";
  const tabs = TABS(`/pool/${poolId}`);

  return (
    <>
      {/* ── Mobile: fixed bottom bar ─────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 h-20 bg-bg/95 backdrop-blur-lg border-t border-border flex items-start pt-2 z-40"
        aria-label="Navegación principal"
      >
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <Link key={t.id} href={t.href} className="flex-1 flex flex-col items-center gap-1 cursor-pointer">
              <NavIcon id={t.id} active={active} />
              <span className={["text-[10px] tracking-wide", active ? "text-brand-green font-semibold" : "text-white/35"].join(" ")}>
                {t.label}
              </span>
              {active && <span className="w-1 h-1 rounded-full bg-brand-green -mt-0.5" />}
            </Link>
          );
        })}
      </nav>

      {/* ── Desktop: fixed left sidebar ──────────────────────────── */}
      <nav
        className="hidden md:flex fixed left-0 top-0 h-full w-[220px] flex-col bg-bg border-r border-border z-40"
        aria-label="Navegación principal"
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/futpul-logo.svg" alt="FUTPUL" className="h-7" />
        </div>
        {/* Nav items */}
        <div className="flex flex-col gap-0.5 p-3 flex-1">
          {tabs.map((t) => {
            const active = t.match(pathname);
            return (
              <Link
                key={t.id}
                href={t.href}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                  active
                    ? "bg-brand-greenDim text-brand-green"
                    : "text-textMuted hover:text-white hover:bg-white/5",
                ].join(" ")}
              >
                <NavIcon id={t.id} active={active} />
                <span className="text-sm font-medium">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function NavIcon({ id, active }: { id: string; active: boolean }) {
  const stroke = active ? "#00E676" : "rgba(255,255,255,0.35)";
  if (id === "home")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (id === "grupos")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke={stroke} strokeWidth="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" stroke={stroke} strokeWidth="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" stroke={stroke} strokeWidth="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" stroke={stroke} strokeWidth="2" />
      </svg>
    );
  if (id === "ranking")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={stroke} strokeWidth="2" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
