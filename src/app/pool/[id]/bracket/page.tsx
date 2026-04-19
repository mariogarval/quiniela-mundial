import { notFound } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { BracketClient } from "@/components/BracketClient";
import { loadGroupMatches, loadPoolWithPlayers } from "@/lib/data";

export default async function BracketPage({ params }: { params: { id: string } }) {
  const { pool } = await loadPoolWithPlayers(params.id);
  if (!pool) return notFound();
  const groupMatches = await loadGroupMatches();
  return (
    <main className="min-h-screen bg-bg">
      <BracketClient poolId={pool.id} groupMatches={groupMatches} />
      <BottomNav poolId={pool.id} />
    </main>
  );
}
