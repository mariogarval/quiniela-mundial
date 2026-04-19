"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Btn } from "@/components/primitives";

export default function AdminLoginPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) throw new Error("Contraseña incorrecta");
      router.push("/admin/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-md mx-auto px-4 pt-20">
        <h1 className="font-display text-3xl font-extrabold mb-1">Panel Admin</h1>
        <p className="text-sm text-textMuted mb-6">Acceso restringido.</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Contraseña"
            className="w-full h-12 px-4 rounded-xl bg-surface2 border border-border focus:border-brand-green outline-none"
          />
          {err && <Card className="border-danger"><div className="p-3 text-sm text-danger">{err}</div></Card>}
          <Btn variant="gradient" type="submit" disabled={loading}>{loading ? "Validando…" : "Entrar"}</Btn>
        </form>
      </div>
    </main>
  );
}
