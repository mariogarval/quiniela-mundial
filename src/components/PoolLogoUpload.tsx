"use client";
import { useEffect, useRef, useState } from "react";
import { getStoredUser } from "@/lib/session";

export function PoolLogoUpload({
  poolId,
  adminId,
  initialLogoUrl,
}: {
  poolId: string;
  adminId: string;
  initialLogoUrl: string | null;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = getStoredUser();
    setIsAdmin(u.id === adminId);
  }, [adminId]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    const u = getStoredUser();
    const form = new FormData();
    form.append("poolId", poolId);
    form.append("userId", u.id ?? "");
    form.append("file", file);
    try {
      const res = await fetch("/api/pool-logo", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir");
      setLogoUrl(data.logoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    const u = getStoredUser();
    setUploading(true);
    await fetch(`/api/pool-logo?poolId=${poolId}&userId=${u.id}`, { method: "DELETE" }).catch(() => {});
    setLogoUrl(null);
    setUploading(false);
  };

  if (!isAdmin && !logoUrl) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Logo display */}
      {logoUrl ? (
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Logo"
            className="w-16 h-16 rounded-2xl object-cover border border-border"
          />
          {isAdmin && (
            <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              <button
                onClick={() => inputRef.current?.click()}
                className="text-[10px] text-white font-semibold bg-white/20 px-1.5 py-0.5 rounded"
              >
                Cambiar
              </button>
              <button
                onClick={handleDelete}
                className="text-[10px] text-danger font-semibold bg-danger/20 px-1.5 py-0.5 rounded"
              >
                Quitar
              </button>
            </div>
          )}
        </div>
      ) : isAdmin ? (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-16 h-16 rounded-2xl border border-dashed border-border bg-surface flex flex-col items-center justify-center gap-0.5 text-textMuted hover:border-brand-green hover:text-brand-green transition-colors"
        >
          {uploading ? (
            <span className="w-3 h-3 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-[9px] font-semibold uppercase tracking-wide">Logo</span>
            </>
          )}
        </button>
      ) : null}

      {isAdmin && (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
      )}

      {error && <p className="text-[10px] text-danger text-center max-w-[120px]">{error}</p>}
    </div>
  );
}
