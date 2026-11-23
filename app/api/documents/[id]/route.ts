import type { JSONContent } from "@tiptap/core";
import { route, readJson, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentForUser, updateDocument } from "@/lib/documents";
import { isUuid, isValidContent, parseTitle } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

async function validId(context: Context) {
  const { id } = await context.params;
  if (!isUuid(id)) throw new ApiError(400, "Invalid document id.");
  return id;
}

// GET /api/documents/:id -> full document (404 missing, 403 no access)
export const GET = route(async (_request: Request, context: Context) => {
  const id = await validId(context);
  const user = await getCurrentUser();
  return Response.json(await getDocumentForUser(id, user.id));
});

// PATCH /api/documents/:id { title?, content? } -> only these two fields are accepted;
// anything else in the body (e.g. owner_id) is ignored.
export const PATCH = route(async (request: Request, context: Context) => {
  const id = await validId(context);
  const user = await getCurrentUser();
  const body = await readJson(request);

  const changes: { title?: string; content?: JSONContent } = {};
  if (body.title !== undefined) {
    const parsed = parseTitle(body.title);
    if ("error" in parsed) throw new ApiError(400, parsed.error);
    changes.title = parsed.title;
  }
  if (body.content !== undefined) {
    if (!isValidContent(body.content)) throw new ApiError(400, "Document content is not valid.");
    changes.content = body.content;
  }
  if (changes.title === undefined && changes.content === undefined) {
    throw new ApiError(400, "Provide a title or content to update.");
  }
  return Response.json(await updateDocument(id, user.id, changes));
});
