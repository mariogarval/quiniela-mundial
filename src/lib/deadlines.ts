export type Deadlines = {
  groupEditDeadline: string | null;     // ISO string
  bracketEditDeadline: string | null;
};

export async function fetchDeadlines(): Promise<Deadlines> {
  const res = await fetch("/api/deadlines");
  if (!res.ok) return { groupEditDeadline: null, bracketEditDeadline: null };
  return res.json();
}
