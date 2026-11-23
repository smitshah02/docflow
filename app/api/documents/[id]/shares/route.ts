import { route, readJson, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getShareInfo, shareDocument } from "@/lib/documents";
import { isUuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

async function validId(context: Context) {
  const { id } = await context.params;
  if (!isUuid(id)) throw new ApiError(400, "Invalid document id.");
  return id;
}

// GET /api/documents/:id/shares -> who has access + who can still be added (owner only)
export const GET = route(async (_request: Request, context: Context) => {
  const id = await validId(context);
  const user = await getCurrentUser();
  return Response.json(await getShareInfo(id, user.id));
});

// POST /api/documents/:id/shares { userId } -> grant access (owner only; 400 self, 409 duplicate)
export const POST = route(async (request: Request, context: Context) => {
  const id = await validId(context);
  const user = await getCurrentUser();
  const { userId } = await readJson(request);
  if (!isUuid(userId)) throw new ApiError(400, "Choose a user to share with.");
  const target = await shareDocument(id, user.id, userId);
  return Response.json({ sharedWith: target }, { status: 201 });
});
