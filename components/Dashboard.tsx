"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DocumentSummary } from "@/lib/types";
import { MAX_IMPORT_BYTES, validateFileMeta } from "@/lib/importText";
import Header from "./Header";

type Lists = { owned: DocumentSummary[]; shared: DocumentSummary[] };

const formatDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Section({ title, docs, empty, showOwner }: { title: string; docs: DocumentSummary[]; empty: string; showOwner?: boolean }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {docs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {docs.map((doc) => (
            <li key={doc.id}>
              <Link href={`/docs/${doc.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50">
                <span className="truncate font-medium">{doc.title}</span>
                <span className="shrink-0 text-right text-xs text-slate-500">
                  {showOwner && <span className="block">Shared by {doc.ownerName}</span>}
                  {!showOwner && !!doc.shareCount && (
                    <span className="block text-indigo-600">Shared with {doc.shareCount} {doc.shareCount === 1 ? "person" : "people"}</span>
                  )}
                  Updated {formatDate(doc.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [lists, setLists] = useState<Lists | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/documents")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setLists(data);
      })
      .catch((e: Error) => setError(e.message || "Could not load your documents."));
  }, []);

  async function createDocument() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/docs/${data.id}`);
    } catch (e) {
      setError((e as Error).message || "Could not create the document.");
      setCreating(false);
    }
  }

  async function importFile(file: File) {
    setError("");
    const problem = validateFileMeta(file.name, file.size); // quick check; the server validates again
    if (problem) return setError(problem);
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/documents/import", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "The server rejected the upload.");
      router.push(`/docs/${data.id}`);
    } catch (e) {
      setError((e as Error).message || "Could not import the file.");
      setImporting(false);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Documents</h1>
          <div className="flex gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              aria-label="Choose a .txt file to import"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = ""; // allow re-selecting the same file
                if (file) importFile(file);
              }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              disabled={importing || creating}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
            >
              {importing ? "Importing…" : "Import Document"}
            </button>
            <button
              onClick={createDocument}
              disabled={creating || importing}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {creating ? "Creating…" : "+ New Document"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-right text-xs text-slate-500">
          Import supports <strong>.txt files only</strong> (UTF-8, max {MAX_IMPORT_BYTES / 1024 / 1024} MB).
        </p>

        {error && (
          <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Getting started</h2>
          <Link
            href="/welcome"
            className="block overflow-hidden rounded-lg border border-slate-200 bg-white px-4 py-3 font-medium hover:bg-slate-50"
          >
            Welcome to DocFlow
          </Link>
        </section>
        {!lists && !error && <p className="mt-8 text-sm text-slate-500">Loading documents…</p>}
        {lists && (
          <>
            <Section title="Owned documents" docs={lists.owned} empty="You haven't created any documents yet. Click “New Document” to start." />
            <Section title="Shared with me" docs={lists.shared} empty="Nothing has been shared with you yet." showOwner />
          </>
        )}
        <p className="mt-10 text-center text-xs text-slate-400">
          Demo app with mock sign-in (the user switcher is not real authentication). Don&apos;t store sensitive or confidential content here.
        </p>
      </main>
    </>
  );
}
