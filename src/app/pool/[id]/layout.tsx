import type { ReactNode } from "react";
import { PoolNav } from "@/components/PoolNav";

export default function PoolLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  return (
    <div className="md:pl-[220px]">
      <PoolNav poolId={params.id} />
      {children}
    </div>
  );
}
