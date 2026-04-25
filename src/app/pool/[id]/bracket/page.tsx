import { notFound } from "next/navigation";
import { BracketClient } from "@/components/BracketClient";
import { KnockoutGate } from "@/components/KnockoutGate";
import { loadGroupMatches, loadPoolWithPlayers } from "@/lib/data";
import { getServerClient } from "@/lib/supabase";
import { PAYMENTS_ENABLED } from "@/lib/flags";

export default async function BracketPage({ params }: { params: { id: string } }) {
  const { pool, players } = await loadPoolWithPlayers(params.id);
  if (!pool) return notFound();

  if (PAYMENTS_ENABLED && !pool.knockout_unlocked) {
    // Check if all group matches are finished (only needed for KnockoutGate)
    const sb = getServerClient();
    const [{ count: finishedGroupCount }, { count: totalGroupCount }] = await Promise.all([
      sb.from("matches").select("id", { count: "exact", head: true }).eq("phase", "group").eq("status", "final"),
      sb.from("matches").select("id", { count: "exact", head: true }).eq("phase", "group"),
    ]);
    const allGroupsDone = (finishedGroupCount ?? 0) >= (totalGroupCount ?? 72);

    return (
      <main className="min-h-screen bg-bg pb-24 md:pb-8">
        <KnockoutGate
          poolId={pool.id}
          adminId={pool.admin_id}
          playerCount={players.length}
          allGroupsDone={allGroupsDone}
        />
      </main>
    );
  }

  const groupMatches = await loadGroupMatches();
  return (
    <main className="min-h-screen bg-bg">
      <BracketClient poolId={pool.id} groupMatches={groupMatches} />
    </main>
  );
}
