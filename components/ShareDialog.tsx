"use client";

import { useEffect, useState } from "react";
import type { ShareInfo } from "@/lib/types";

export default function ShareDialog({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [version, setVersion] = useState(0); // bump to reload after sharing

  useEffect(() => {
    fetch(`/api/documents/${documentId}/shares`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setInfo(data);
        setSelectedId(data.available[0]?.id ?? "");
      })
      .catch((e: Error) => setError(e.message || "Could not load sharing settings."));
  }, [documentId, version]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function share() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`Shared with ${data.sharedWith.name}.`);
      setVersion((v) => v + 1);
    } catch (e) {
      setError((e as Error).message || "Could not share the document.");
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share document"
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share document</h2>
          <button onClick={onClose} aria-label="Close" className="rounded px-2 text-slate-500 hover:bg-slate-100">
            ✕
          </button>
        </div>

        {error && <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {!info && !error && <p className="mt-4 text-sm text-slate-500">Loading…</p>}

        {info && (
          <>
            <div className="mt-4">
              {info.available.length === 0 ? (
                <p className="text-sm text-slate-500">Everyone has access already.</p>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    aria-label="User to share with"
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-2 text-sm"
                  >
                    {info.available.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={share}
                    disabled={busy || !selectedId}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {busy ? "Sharing…" : "Share"}
                  </button>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500">People you share with can open and edit this document, but cannot share it further.</p>
            </div>

            <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">People with access</h3>
            {info.sharedWith.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Only you for now.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {info.sharedWith.map((u) => (
                  <li key={u.id} className="py-2">
                    {u.name} <span className="text-slate-500">({u.email})</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
