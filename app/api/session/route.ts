import { route, readJson, ApiError } from "@/lib/api";
import { USER_COOKIE, findUser, getCurrentUser, listUsers } from "@/lib/auth";
import { isUuid } from "@/lib/validation";

// Demo-user "session" (mock auth). GET: who am I + who can I switch to. POST: switch user.
export const GET = route(async () => {
  const [users, current] = await Promise.all([listUsers(), getCurrentUser()]);
  return Response.json({ users, currentUserId: current.id });
});

export const POST = route(async (request: Request) => {
  const { userId } = await readJson(request);
  if (!isUuid(userId) || !(await findUser(userId))) throw new ApiError(400, "Unknown demo user.");
  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${USER_COOKIE}=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
  return response;
});
