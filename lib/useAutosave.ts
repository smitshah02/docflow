"use client";

import type { JSONContent } from "@tiptap/core";
import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";
type Patch = { title?: string; content?: JSONContent };

const DEBOUNCE_MS = 1000;

// Debounced autosave. Edits are collected in `pending`; one PATCH at a time sends them.
// If a save fails the edits go back into `pending`, so nothing is silently dropped.
export function useAutosave(documentId: string) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState("");
  const pending = useRef<Patch>({});
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hasPending = () => Object.keys(pending.current).length > 0;

  // Sends everything pending now. Resolves true when nothing is left unsaved.
  // `keepalive` lets the request finish even while the page is closing.
  const flush = useCallback(
    async (keepalive = false): Promise<boolean> => {
      clearTimeout(timer.current);
      while (inFlight.current) await inFlight.current; // one request at a time keeps writes ordered
      if (!hasPending()) return true;

      const patch = pending.current;
      pending.current = {};
      setStatus("saving");

      const request = (async () => {
        try {
          const res = await fetch(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
            keepalive,
          });
          if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Save failed.");
          return true;
        } catch (e) {
          pending.current = { ...patch, ...pending.current }; // restore; newer edits win
          setErrorMessage((e as Error).message || "Could not save.");
          setStatus("error");
          return false;
        }
      })();

      inFlight.current = request;
      const ok = await request;
      inFlight.current = null;
      if (ok) setStatus(hasPending() ? "unsaved" : "saved");
      return ok && !hasPending();
    },
    [documentId],
  );

  const queue = useCallback(
    (patch: Patch) => {
      pending.current = { ...pending.current, ...patch };
      setStatus("unsaved");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(), DEBOUNCE_MS);
    },
    [flush],
  );

  // Don't lose edits when the tab closes, hides, or the component unmounts.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasPending() || inFlight.current) {
        event.preventDefault(); // browser shows its "unsaved changes" prompt
        flush(true);
      }
    };
    const onHidden = () => document.visibilityState === "hidden" && flush(true);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onHidden);
      flush(true);
    };
  }, [flush]);

  return { status, errorMessage, queue, flush };
}
