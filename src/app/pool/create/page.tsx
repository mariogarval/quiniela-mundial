"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Btn } from "@/components/primitives";
import { setStoredUser } from "@/lib/session";
import { identify, track } from "@/lib/analytics";

export default function CreatePoolPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !adminName.trim() || !adminEmail.trim()) {
      setError("Completa todos los campos");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, adminName, adminEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear la quiniela");
      setStoredUser({ id: data.user.id, name: adminName, poolId: data.pool.id, poolName: data.pool.name ?? name });
      identify(data.user.id, { name: adminName, role: "admin" });
      track("pool_created", { pool_id: data.pool.id, pool_name: data.pool.name ?? name });
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
        <h1 className="font-display text-3xl font-extrabold mb-1">Crear Quiniela</h1>
        <p className="text-sm text-textMuted mb-6">Como admin, tú invitas y cobras la entrada por fuera. La app no mueve dinero entre jugadores.</p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Nombre de la quiniela" value={name} onChange={setName} placeholder="Ej: La Quiniela del Trabajo" />
          <Field label="Tu nombre" value={adminName} onChange={setAdminName} placeholder="Carlos V." />
          <Field label="Email" value={adminEmail} onChange={setAdminEmail} type="email" placeholder="carlos@empresa.com" />

          {error && (
            <Card className="border-danger">
              <div className="p-3 text-sm text-danger">{error}</div>
            </Card>
          )}

          <Btn variant="gradient" type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear quiniela"}
          </Btn>
        </form>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-textMuted uppercase tracking-wider mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 px-4 rounded-xl bg-surface2 border border-border focus:border-brand-green outline-none text-white placeholder:text-textSub transition-colors"
      />
    </label>
  );
}

