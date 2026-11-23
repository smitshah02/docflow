"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type SaveStatus, useAutosave } from "@/lib/useAutosave";
import type { DocumentDetail } from "@/lib/types";
import Header from "./Header";
import ShareDialog from "./ShareDialog";
import Toolbar from "./Toolbar";

const STATUS_TEXT: Record<SaveStatus, string> = { saved: "Saved", unsaved: "Unsaved changes", saving: "Saving…", error: "Save failed" };
const STATUS_COLOR: Record<SaveStatus, string> = {
  saved: "text-emerald-600",
  unsaved: "text-slate-500",
  saving: "text-slate-500",
  error: "text-red-600",
};

// Keep this in sync with ALLOWED_NODES / ALLOWED_MARKS in lib/validation.ts (the server rejects anything else).
const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    link: false,
  }),
];

function EditorScreen({ doc }: { doc: DocumentDetail }) {
  const router = useRouter();
  const { status, errorMessage, queue, flush } = useAutosave(doc.id);
  const [title, setTitle] = useState(doc.title);
  const [sharing, setSharing] = useState(false);

  const editor = useEditor({
    extensions,
    content: doc.content,
    immediatelyRender: false, // avoids SSR hydration mismatch in Next.js
    editorProps: { attributes: { "aria-label": "Document body" } },
    onUpdate: ({ editor }) => queue({ content: editor.getJSON() }),
  });

  return (
    <>
      <Header guard={() => flush()} />
      <div className="sticky top-0 z-10">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <Link href="/" onClick={async (e) => { e.preventDefault(); if (await flush()) router.push("/"); }} className="text-sm text-slate-500 hover:text-slate-900">
              ← Documents
            </Link>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) queue({ title: e.target.value.trim() });
              }}
              onBlur={() => { if (!title.trim()) { setTitle("Untitled document"); queue({ title: "Untitled document" }); } }}
              maxLength={200}
              aria-label="Document title"
              className="min-w-0 flex-1 rounded border border-transparent px-2 py-1 text-lg font-semibold hover:border-slate-200 focus:border-indigo-400 focus:outline-none"
            />
            {doc.isOwner && (
              <button
                onClick={() => setSharing(true)}
                className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
              >
                Share
              </button>
            )}
            <div role="status" className={`shrink-0 text-sm ${STATUS_COLOR[status]}`}>
              {STATUS_TEXT[status]}
              {status === "error" && (
                <button onClick={() => flush()} className="ml-2 underline">
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
        {editor && <Toolbar editor={editor} />}
      </div>
      {sharing && <ShareDialog documentId={doc.id} onClose={() => setSharing(false)} />}
      {status === "error" && (
        <p role="alert" className="bg-red-50 px-4 py-2 text-center text-sm text-red-700">
          {errorMessage} Your latest edits are still in this tab; we&apos;ll keep retrying when you type or click Retry.
        </p>
      )}
      <main className="mx-auto w-full max-w-3xl flex-1 px-2 py-6 sm:px-4">
        <article className="rounded-lg border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-10 sm:py-10">
          <EditorContent editor={editor} />
        </article>
        <p className="mt-3 text-center text-xs text-slate-400">
          {doc.isOwner ? "You own this document" : `Shared by ${doc.ownerName}`}
        </p>
      </main>
    </>
  );
}

export default function DocumentEditor({ documentId }: { documentId: string }) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/documents/${documentId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setDoc(data);
      })
      .catch((e: Error) => setError(e.message || "Could not load this document."));
  }, [documentId]);

  if (doc) return <EditorScreen doc={doc} />;
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 text-center">
        {error ? (
          <>
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
            <Link href="/" className="mt-4 inline-block text-sm text-indigo-600 underline">
              Back to documents
            </Link>
          </>
        ) : (
          <p className="text-sm text-slate-500">Loading document…</p>
        )}
      </main>
    </>
  );
}
