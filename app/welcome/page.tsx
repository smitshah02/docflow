import Link from "next/link";
import Header from "@/components/Header";

// Static, read-only onboarding page: not a database document, so it has no owner, no shares,
// and nothing here can be edited, renamed or shared. Every demo user sees the same page.
export default function WelcomePage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-2 py-6 sm:px-4">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Documents
        </Link>
        <article className="mt-3 rounded-lg border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-10 sm:py-10">
          <h1 className="mb-3 text-3xl font-bold">Welcome to DocFlow</h1>
          <p className="mb-3 leading-7">
            DocFlow is a lightweight document editor. Create a document, format it with <strong>bold</strong>,{" "}
            <em>italic</em> and <u>underline</u>, headings and lists, and it saves automatically.
          </p>
          <ul className="mb-3 list-disc space-y-1 pl-6 leading-7">
            <li>Use <strong>+ New Document</strong> to start writing, or <strong>Import Document</strong> to turn a .txt file into a document.</li>
            <li>Owners can click <strong>Share</strong> in the editor to give another demo user access.</li>
            <li>Documents shared with you appear under <strong>Shared With Me</strong> and you can edit them.</li>
            <li>Use the demo user menu (top right) to switch between Alice, Bob and Charlie.</li>
          </ul>
          <p className="text-sm text-slate-500">This guide is read-only. Demo users are mock authentication, not real accounts.</p>
        </article>
      </main>
    </>
  );
}
