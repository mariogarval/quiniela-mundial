"use client";
import { useEffect, useState } from "react";

export function PoolCodeCard({
  joinCode,
  poolName,
}: {
  joinCode: string;
  poolName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const waText = encodeURIComponent(
    `¡Únete a mi quiniela del Mundial 2026 en FUTPUL! 🌍⚽\nQuiniela: ${poolName}\nCódigo: ${joinCode}\n👉 https://futpul.com/pool/join`
  );

  const slackText = `¡Únete a mi quiniela del Mundial 2026 en FUTPUL! 🌍⚽ Quiniela: ${poolName} | Código: ${joinCode} | https://futpul.com/pool/join`;

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-brand-green/40 bg-brand-greenDim px-4 py-3">
      <p className="text-[10px] text-brand-green uppercase tracking-[0.2em] font-semibold mb-2">
        Código de invitación
      </p>
      <div className="flex items-center gap-2">
        {/* Code */}
        <span className="font-display text-3xl font-extrabold tracking-[0.3em] text-white flex-1">
          {joinCode}
        </span>

        {/* Copy */}
        <button
          onClick={copy}
          title={copied ? "¡Copiado!" : "Copiar código"}
          className={[
            "w-9 h-9 rounded-lg border flex items-center justify-center transition-all shrink-0",
            copied
              ? "bg-brand-green border-brand-green text-black"
              : "bg-transparent border-brand-green/60 text-brand-green",
          ].join(" ")}
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          )}
        </button>

        {/* WhatsApp */}
        <a
          href={`https://wa.me/?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Compartir por WhatsApp"
          className="w-9 h-9 rounded-lg bg-[#25D366] flex items-center justify-center shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="black">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>

        {/* Slack */}
        <button
          onClick={() => { navigator.clipboard.writeText(slackText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          title="Copiar para Slack"
          className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
