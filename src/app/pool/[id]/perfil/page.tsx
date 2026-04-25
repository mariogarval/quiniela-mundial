"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Btn } from "@/components/primitives";
import { getStoredUser, clearStoredUser } from "@/lib/session";

export default function PerfilPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<{ name: string; id: string } | null>(null);
  const [points, setPoints] = useState<{ total: number; predictions: number } | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u.id) return;
    setMe({ id: u.id, name: u.name ?? "" });
    fetch(`/api/predictions?userId=${u.id}`)
      .then((r) => r.json())
      .then((d) => setPoints({ total: 0, predictions: (d.predictions?.length ?? 0) + (d.bracket?.length ?? 0) }));
  }, []);

  return (
    <main className="min-h-screen bg-bg pb-24 md:pb-8">
      {/* Full-width gradient header */}
      <div className="bg-gradient-to-b from-[#0F1624] to-bg">
        <div className="max-w-xl mx-auto pt-14 md:pt-8 pb-6 px-4 text-center">
          <div className="w-[72px] h-[72px] mx-auto mb-3 rounded-full bg-brand-greenDim border-2 border-brand-green flex items-center justify-center font-display text-2xl font-extrabold text-brand-green">
            {me ? initials(me.name) : "?"}
          </div>
          <div className="font-display text-2xl font-extrabold">Mi Perfil</div>
          <div className="text-sm text-textMuted mt-1">{me?.name ?? "Invitado"}</div>
        </div>
      </div>

      {/* Centered content column */}
      <div className="max-w-xl mx-auto p-4 flex flex-col gap-3">
        <Card>
          <div className="p-4 grid grid-cols-3 gap-3">
            <Stat val={String(points?.total ?? 0)} label="Puntos" />
            <Stat val={String(points?.predictions ?? 0)} label="Predicciones" />
            <Stat val="—" label="Posición" />
          </div>
        </Card>

        <Link href={`/pool/${id}/grupos`} className="block">
          <Btn variant="outline">Ver mi quiniela</Btn>
        </Link>
        <Btn variant="outline" onClick={() => { clearStoredUser(); router.push("/"); }}>
          Cerrar sesión
        </Btn>
      </div>
    </main>
  );
}

function Stat({ val, label }: { val: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-3xl font-extrabold text-brand-green">{val}</div>
      <div className="text-[10px] text-textMuted mt-0.5">{label}</div>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "YO";
}
