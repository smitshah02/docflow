import { cookies } from "next/headers";
import { ApiError } from "./api";
import { db } from "./db";
import type { User } from "./types";
import { isUuid } from "./validation";

// MOCK AUTH (assessment-permitted): the "session" is just a cookie holding a demo user's id.
// Anyone can switch to any demo user. It identifies who is acting; it does NOT prove who they are.
export const USER_COOKIE = "docflow_user_id";
const DEFAULT_USER_EMAIL = "alice@example.com";

export async function listUsers(): Promise<User[]> {
  return (await db()`SELECT id, name, email FROM users ORDER BY name`) as User[];
}

export async function findUser(id: string): Promise<User | undefined> {
  const rows = (await db()`SELECT id, name, email FROM users WHERE id = ${id}`) as User[];
  return rows[0];
}

// Resolves the acting user from the cookie (falls back to Alice so first load just works).
// Every API route calls this first, so identity is always decided server-side.
export async function getCurrentUser(): Promise<User> {
  const cookieValue = (await cookies()).get(USER_COOKIE)?.value;
  if (isUuid(cookieValue)) {
    const user = await findUser(cookieValue);
    if (user) return user;
  }
  const rows = (await db()`SELECT id, name, email FROM users WHERE email = ${DEFAULT_USER_EMAIL}`) as User[];
  if (!rows[0]) throw new ApiError(500, "Demo users are missing. Run `npm run db:setup`.");
  return rows[0];
}
