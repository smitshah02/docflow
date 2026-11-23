import { neon } from "@neondatabase/serverless";
import { ApiError } from "./api";

let client: ReturnType<typeof neon> | undefined;

// Server-only: DATABASE_URL is never sent to the browser. All queries use tagged templates,
// which the Neon driver turns into parameterized queries (no string concatenation).
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    throw new ApiError(500, "The database is not configured.");
  }
  return (client ??= neon(url));
}
