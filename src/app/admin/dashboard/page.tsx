import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, Btn } from "@/components/primitives";
import { isAdminAuthed } from "@/lib/adminAuth";
import { getServerClient } from "@/lib/supabase";
import { AdminResults } from "@/components/AdminResults";
import { PAYMENTS_ENABLED } from "@/lib/flags";

export default async function AdminDashboard() {
  if (!isAdminAuthed()) redirect("/admin");

  const sb = getServerClient();
  const [{ data: pools }, { data: matches }] = await Promise.all([
    sb.from("pools").select("*").order("created_at", { ascending: false }),
    sb.from("matches").select("*").order("phase").order("slot"),
  ]);

  const stats = {
    totalPools: pools?.length ?? 0,
    paidPools: pools?.filter((p) => p.payment_status !== "none").length ?? 0,
    free: pools?.filter((p) => p.plan === "free").length ?? 0,
    business: pools?.filter((p) => p.plan === "business").length ?? 0,
  };

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 pt-10 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-display text-3xl font-extrabold">Panel Admin</h1>
          <Link href="/" className="text-textMuted text-sm">Salir</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard v={String(stats.totalPools)} l="Pools totales" />
          <StatCard v={String(stats.free)} l="Free" />
          <StatCard v={String(stats.business)} l="Business" />
          {PAYMENTS_ENABLED && <StatCard v={String(stats.paidPools)} l="Con pago" />}
        </div>

        <section className="mb-6">
          <h2 className="font-display text-xl font-bold mb-3">Quinielas</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-textSub uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-2">Nombre</th>
                    <th className="text-left px-3 py-2">Admin</th>
                    <th className="text-left px-3 py-2">Plan</th>
                    <th className="text-left px-3 py-2">Estado</th>
                    {PAYMENTS_ENABLED && <th className="text-left px-3 py-2">Pago</th>}
                    <th className="text-left px-3 py-2">Código</th>
                  </tr>
                </thead>
                <tbody>
                  {(pools ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="px-3 py-2 font-semibold">{p.name}</td>
                      <td className="px-3 py-2 text-textMuted">{p.admin_email}</td>
                      <td className="px-3 py-2">{p.plan}</td>
                      <td className="px-3 py-2">{p.status}</td>
                      {PAYMENTS_ENABLED && <td className="px-3 py-2">{p.payment_status}</td>}
                      <td className="px-3 py-2 font-display tracking-widest">{p.join_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold mb-3">Resultados reales</h2>
          <p className="text-sm text-textMuted mb-3">
            Ingresa resultados reales conforme avance el torneo. El motor de puntos se recalcula automáticamente.
          </p>
          <AdminResults matches={matches ?? []} />
        </section>
      </div>
    </main>
  );
}

function StatCard({ v, l }: { v: string; l: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3">
      <div className="font-display text-2xl font-extrabold">{v}</div>
      <div className="text-[11px] text-textMuted uppercase tracking-wider">{l}</div>
    </div>
  );
}
