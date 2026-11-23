import { route, readJson, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createDocument, listDocuments } from "@/lib/documents";
import { parseTitle } from "@/lib/validation";

// GET /api/documents -> { owned: [...], shared: [...] } for the current demo user (no content, keeps it light)
export const GET = route(async () => {
  const user = await getCurrentUser();
  return Response.json(await listDocuments(user.id));
});

// POST /api/documents { title? } -> creates an empty document owned by the current user
export const POST = route(async (request: Request) => {
  const user = await getCurrentUser();
  const body = await readJson(request).catch(() => ({}) as Record<string, unknown>);
  let title = "Untitled document";
  if (body.title !== undefined) {
    const parsed = parseTitle(body.title);
    if ("error" in parsed) throw new ApiError(400, parsed.error);
    title = parsed.title;
  }
  return Response.json(await createDocument(user.id, title), { status: 201 });
});
