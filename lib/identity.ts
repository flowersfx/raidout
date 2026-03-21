import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "raidout_uid";

/**
 * Returns the current user's DB id, creating an anonymous user record on
 * first use. The cookie itself is always set by middleware before this runs,
 * so we never need to write cookies here (which would be restricted to Server
 * Actions / Route Handlers only).
 */
export async function getOrCreateUserId(): Promise<string> {
  const cookieStore = await cookies();
  const uid = cookieStore.get(COOKIE_NAME)?.value;
  if (!uid) throw new Error("Identity cookie missing — is middleware running?");

  const existing = await prisma.user.findUnique({ where: { id: uid } });
  if (existing) return existing.id;

  // First time we see this cookie value: materialise the user in the DB.
  // We use the cookie UUID as the user id so there is no secondary lookup.
  await prisma.user.create({
    data: {
      id: uid,
      email: `anon-${uid}@raidout.local`,
    },
  });

  return uid;
}
