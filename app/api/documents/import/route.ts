import { route, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createDocument } from "@/lib/documents";
import { decodeText, textToDoc, titleFromFileName, validateFileMeta } from "@/lib/importText";
import { isValidContent } from "@/lib/validation";

// POST /api/documents/import (multipart form, field "file") -> new document owned by the current user.
// The file is never stored: its text becomes Tiptap JSON in the documents table.
export const POST = route(async (request: Request) => {
  const user = await getCurrentUser();

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    throw new ApiError(400, "Upload a .txt file using the form field 'file'.");
  }
  if (!(file instanceof File)) throw new ApiError(400, "No file was uploaded.");

  const metaError = validateFileMeta(file.name, file.size);
  if (metaError) throw new ApiError(400, metaError);

  const decoded = decodeText(await file.arrayBuffer());
  if ("error" in decoded) throw new ApiError(400, decoded.error);

  const content = textToDoc(decoded.text);
  if (!isValidContent(content)) throw new ApiError(400, "This file is too large or complex to import as a document.");

  return Response.json(await createDocument(user.id, titleFromFileName(file.name), content), { status: 201 });
});
