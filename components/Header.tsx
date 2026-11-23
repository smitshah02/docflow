"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@/lib/types";

// `guard` lets a page (the editor) make sure unsaved edits are flushed before we leave or switch user.
export default function Header({ guard }: { guard?: () => Promise<boolean> }) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/session")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUsers(data.users);
        setCurrentUserId(data.currentUserId);
      })
      .catch((e: Error) => setError(e.message || "Could not load demo users."));
  }, []);

  async function switchUser(userId: string) {
    if (guard && !(await guard())) return; // unsaved changes failed to save: stay put
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return setError("Could not switch user.");
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/"; // full reload so every view re-fetches as the new user
  }

  async function goHome(event: React.MouseEvent) {
    if (!guard) return;
    event.preventDefault();
    if (await guard()) router.push("/");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" onClick={goHome} className="flex items-center gap-2 text-lg font-semibold text-indigo-600">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-sm text-white">D</span>
          DocFlow
        </Link>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="hidden sm:inline" title="Mock authentication for the demo: not real security">
            Demo user
          </span>
          <select
            value={currentUserId}
            onChange={(e) => switchUser(e.target.value)}
            disabled={users.length === 0}
            aria-label="Switch demo user"
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            {users.length === 0 && <option>{error ? "Unavailable" : "Loading…"}</option>}
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="bg-red-50 px-4 py-1 text-center text-sm text-red-700">{error}</p>}
    </header>
  );
}
