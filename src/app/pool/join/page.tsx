"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Btn } from "@/components/primitives";
import { setStoredUser } from "@/lib/session";
import { identify, track } from "@/lib/analytics";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refUserId, setRefUserId] = useState<string | null>(null);
  const [challenger, setChallenger] = useState<{ name: string; correct: number; total: number } | null>(null);

  // Read ?ref and ?code from URL on mount
  useEffect(() => {
    const ref = searchParams.get("ref");
    const codeParam = searchParams.get("code");
    if (codeParam) setCode(codeParam.toUpperCase());
    if (ref) {
      setRefUserId(ref);
      // Store for use after form submit
      sessionStorage.setItem("pending_ref", ref);
      // Fetch challenger stats for the challenge banner
      fetch(`/api/user-stats?userId=${ref}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.name) setChallenger({ name: d.name, correct: d.correctPredictions ?? 0, total: d.totalPredictions ?? 0 });
        })
        .catch(() => {});
    }
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim() || !name.trim() || !email.trim()) {
      setError("Completa todos los campos");
      return;
    }
    setLoading(true);
    try {
      const ref = refUserId ?? sessionStorage.getItem("pending_ref");
      const res = await fetch("/api/pool", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          joinCode: code.trim().toUpperCase(),
          name,
          email,
          referredBy: ref ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al unirse");
      sessionStorage.removeItem("pending_ref");
      setStoredUser({ id: data.user.id, name, poolId: data.pool.id, poolName: data.pool.name });
      identify(data.user.id, { name, role: "member" });
      track("pool_joined", { pool_id: data.pool.id, pool_name: data.pool.name, via_invite: !!ref });
      router.push(`/pool/${data.pool.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Challenge banner — shown when arriving via ?ref= invite link */}
      {challenger && (
        <div className="mb-4 p-3 rounded-xl border border-brand-green/40 bg-brand-greenDim text-sm text-center">
          <span className="font-bold text-brand-green">{challenger.name}</span>
          {challenger.total > 0 ? (
            <> fue {challenger.correct}/{challenger.total} · ¿Los superas?</>
          ) : (
            <> te reta · ¿Aceptas?</>
          )}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="block">
          <span className="block text-xs text-textMuted uppercase tracking-wider mb-1.5">Código</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXX"
            maxLength={8}
            className="w-full h-14 px-4 rounded-xl bg-surface2 border border-border focus:border-brand-green outline-none text-white text-center text-2xl tracking-[0.4em] font-display font-bold"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-textMuted uppercase tracking-wider mb-1.5">Tu nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Diego R."
            className="w-full h-12 px-4 rounded-xl bg-surface2 border border-border focus:border-brand-green outline-none text-white"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-textMuted uppercase tracking-wider mb-1.5">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="diego@ejemplo.com"
            className="w-full h-12 px-4 rounded-xl bg-surface2 border border-border focus:border-brand-green outline-none text-white"
          />
        </label>
        {error && (
          <Card className="border-danger">
            <div className="p-3 text-sm text-danger">{error}</div>
          </Card>
        )}
        <Btn variant="gradient" type="submit" disabled={loading}>
          {loading ? "Uniendo..." : "Entrar a la quiniela"}
        </Btn>
      </form>
    </>
  );
}

export default function JoinPoolPage() {
  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-lg px-4 pt-14 pb-16">
        <Link href="/" className="text-textMuted text-sm mb-6 inline-block">← Volver</Link>
        <h1 className="font-display text-3xl font-extrabold mb-1">Unirme a una Quiniela</h1>
        <p className="text-sm text-textMuted mb-6">Pregunta a tu admin por el código de 6 caracteres.</p>
        <Suspense fallback={null}>
          <JoinForm />
        </Suspense>
      </div>
    </main>
  );
}
