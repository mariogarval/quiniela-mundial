import Link from "next/link";
import { Card, Btn } from "@/components/primitives";
import { CountdownTimer } from "@/components/CountdownTimer";
import { LandingClient } from "@/components/LandingClient";
import { TrackingPixel } from "@/components/TrackingPixel";
import { LOCK_DATE_ISO } from "@/lib/constants";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg">
      <TrackingPixel />
      <div className="mx-auto max-w-md px-4 pt-16 pb-24">
        <header className="text-center mb-6">
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/futpul-logo.svg" alt="FUTPUL" height={36} className="h-9" />
          </div>
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="text-lg">⚽</span>
            <span className="text-xs font-semibold text-brand-green uppercase tracking-[0.2em] font-display">
              World Cup 2026
            </span>
          </div>
          <p className="text-sm text-textMuted mt-1">
            Predice los 72 partidos de grupos, arma tu llave, y compite con tu crew.
          </p>
        </header>

        <div className="mb-4">
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulseDot" />
                <span className="text-xs text-textMuted uppercase tracking-widest">Cierra en</span>
              </div>
              <CountdownTimer targetIso={LOCK_DATE_ISO} />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/pool/create" className="block">
            <Btn variant="gradient" className="h-14 text-lg">
              Crear una quiniela
            </Btn>
          </Link>
          <Link href="/pool/join" className="block">
            <Btn variant="outline">Unirme con código</Btn>
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-textMuted">
          <span>🔥 2,847 personas prediciendo ahora</span>
          <span>·</span>
          <span>🏆 Top hoy: 18 pts</span>
        </div>

        <LandingClient />

        <div className="mt-8 grid grid-cols-2 gap-3">
          <FeatureBox title="Grupos" items={["Jugadores ilimitados", "72 predicciones", "Tabla en tiempo real"]} />
          <FeatureBox title="Eliminatorias" highlight items={["Fase knockout completa", "Arma tu llave", "Campeón predicho", "100% gratis"]} />
        </div>

        <p className="text-[11px] text-textSub text-center mt-8">
          Cierre: 11 Jun 2026 · 13:00 GMT-6 · Sin excepciones
        </p>
      </div>
    </main>
  );
}

function FeatureBox({ title, items, highlight }: { title: string; items: string[]; highlight?: boolean }) {
  return (
    <div
      className={[
        "rounded-2xl p-4 border",
        highlight ? "border-brand-green bg-brand-greenDim" : "border-border bg-surface",
      ].join(" ")}
    >
      <div className={["font-display font-bold tracking-widest uppercase text-sm mb-2", highlight ? "text-brand-green" : "text-white"].join(" ")}>
        {title}
      </div>
      <ul className="text-xs text-textMuted space-y-1">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-brand-green leading-none pt-0.5">✓</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
