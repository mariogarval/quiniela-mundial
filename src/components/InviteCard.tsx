"use client";
import { useEffect, useState } from "react";
import { getStoredUser } from "@/lib/session";
import { track } from "@/lib/analytics";

export function InviteCard({
  joinCode,
  poolName,
  referralCount,
}: {
  joinCode: string;
  poolName: string;
  referralCount?: number;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    if (u.id) setUserId(u.id);
  }, []);

  const inviteUrl = userId
    ? `https://futpul.com/pool/join?code=${joinCode}&ref=${userId}`
    : `https://futpul.com/pool/join?code=${joinCode}`;

  const copy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    track("invite_link_copied", { join_code: joinCode, has_ref: !!userId });
  };

  const waText = encodeURIComponent(
    `¡Te reto en FUTPUL! 🔥⚽\nÚnete a mi quiniela del Mundial 2026: ${poolName}\n👉 ${inviteUrl}`
  );

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-brand-green/30 bg-surface px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-brand-green uppercase tracking-[0.2em] font-semibold">
          Invita a tus amigos
        </p>
        {(referralCount ?? 0) > 0 && (
          <span className="text-[11px] text-textMuted">
            {referralCount} {referralCount === 1 ? "amigo invitado" : "amigos invitados"}
          </span>
        )}
      </div>
      <p className="text-[11px] text-textMuted truncate mb-2.5">{inviteUrl}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={copy}
          className={[
            "flex-1 h-9 rounded-lg border text-xs font-semibold transition-all",
            copied
              ? "bg-brand-green border-brand-green text-black"
              : "bg-transparent border-brand-green/60 text-brand-green",
          ].join(" ")}
        >
          {copied ? "¡Copiado!" : "Copiar enlace"}
        </button>
        <a
          href={`https://wa.me/?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("invite_whatsapp_clicked", { join_code: joinCode })}
          className="h-9 px-3 rounded-lg bg-[#25D366] flex items-center justify-center shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="black">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
