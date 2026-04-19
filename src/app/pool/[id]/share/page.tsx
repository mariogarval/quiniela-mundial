import { notFound } from "next/navigation";
import { loadPoolWithPlayers } from "@/lib/data";
import { ShareClient } from "@/components/ShareClient";

export default async function SharePage({ params }: { params: { id: string } }) {
  const { pool } = await loadPoolWithPlayers(params.id);
  if (!pool) return notFound();
  return <ShareClient poolId={pool.id} poolName={pool.name} />;
}
