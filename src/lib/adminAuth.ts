import { cookies } from "next/headers";

export function isAdminAuthed(): boolean {
  return cookies().get("qm_admin")?.value === "1";
}
