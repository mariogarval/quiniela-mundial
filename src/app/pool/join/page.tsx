"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Btn } from "@/components/primitives";
import { setStoredUser } from "@/lib/session";

export default function JoinPoolPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim() || !name.trim() || !email.trim()) {
      setError("Completa todos los campos");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/pool", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code.trim().toUpperCase(), name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al unirse");
      setStoredUser({ id: data.user.id, name, poolId: data.pool.id });
      router.push(`/pool/${data.pool.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-md px-4 pt-14 pb-24">
        <Link href="/" className="text-textMuted text-sm mb-6 inline-block">← Volver</Link>
        <h1 className="font-display text-3xl font-extrabold mb-1">Unirme a una Quiniela</h1>
        <p className="text-sm text-textMuted mb-6">Pregunta a tu admin por el código de 6 caracteres.</p>

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
      </div>
    </main>
  );
}
