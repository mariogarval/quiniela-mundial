"use client";
import { useState } from "react";
import { Card, Btn } from "./primitives";
import { getStoredUser } from "@/lib/session";

export function KnockoutGate({
  poolId,
  adminId,
  playerCount,
  allGroupsDone,
}: {
  poolId: string;
  adminId: string;
  playerCount: number;
  allGroupsDone: boolean;
}) {
  const { id: userId } = getStoredUser();
  const isAdmin = userId === adminId;

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-5xl">⏳</div>
        <h2 className="font-display text-2xl font-extrabold">Esperando eliminatorias</h2>
        <p className="text-sm text-textMuted max-w-xs">
          {allGroupsDone
            ? "El admin de la quiniela está por activar la fase eliminatoria. Vuelve pronto."
            : "La fase de grupos no ha terminado todavía. Las eliminatorias se activarán cuando todos los partidos estén listos."}
        </p>
      </div>
    );
  }

  return (
    <AdminUnlockGate
      poolId={poolId}
      playerCount={playerCount}
      allGroupsDone={allGroupsDone}
    />
  );
}

function AdminUnlockGate({
  poolId,
  playerCount,
  allGroupsDone,
}: {
  poolId: string;
  playerCount: number;
  allGroupsDone: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pool/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al activar eliminatorias");
      if (data.unlocked) window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  if (!allGroupsDone) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-5xl">⚽</div>
        <h2 className="font-display text-2xl font-extrabold">Fase de grupos en curso</h2>
        <p className="text-sm text-textMuted max-w-xs">
          Las eliminatorias se activarán cuando todos los 72 partidos de grupos estén finalizados.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-10 pb-4 flex flex-col gap-4 max-w-md mx-auto">
      <div className="text-center mb-2">
        <div className="text-5xl mb-3">🏆</div>
        <h2 className="font-display text-3xl font-extrabold leading-tight">¡Fase de grupos terminada!</h2>
        <p className="text-sm text-textMuted mt-2">
          Tu quiniela tiene{" "}
          <span className="text-white font-semibold">{playerCount} jugadores</span>{" "}
          listos para las eliminatorias.
        </p>
      </div>

      <Card>
        <div className="p-4 text-center">
          <div className="text-lg font-semibold mb-1">¿Activamos las eliminatorias?</div>
          <p className="text-xs text-textMuted mb-4">
            Activa la fase eliminatoria para todos los jugadores de esta quiniela.
          </p>

          {error && <p className="text-xs text-danger mb-3">{error}</p>}

          <Btn variant="gradient" onClick={handleUnlock} disabled={loading}>
            {loading ? "Activando…" : "Activar eliminatorias"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
