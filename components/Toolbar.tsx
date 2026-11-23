"use client";

import { type Editor, useEditorState } from "@tiptap/react";

type Button = { label: string; text: string; active: boolean; run: () => void; className?: string };

export default function Toolbar({ editor }: { editor: Editor }) {
  // Tiptap doesn't re-render React on every keystroke, so subscribe to just what the toolbar shows.
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      h1: editor.isActive("heading", { level: 1 }),
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bullet: editor.isActive("bulletList"),
      ordered: editor.isActive("orderedList"),
    }),
  });
  const chain = () => editor.chain().focus();

  const buttons: (Button | "divider")[] = [
    { label: "Bold", text: "B", active: active.bold, run: () => chain().toggleBold().run(), className: "font-bold" },
    { label: "Italic", text: "I", active: active.italic, run: () => chain().toggleItalic().run(), className: "italic" },
    { label: "Underline", text: "U", active: active.underline, run: () => chain().toggleUnderline().run(), className: "underline" },
    "divider",
    { label: "Heading 1", text: "H1", active: active.h1, run: () => chain().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", text: "H2", active: active.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", text: "H3", active: active.h3, run: () => chain().toggleHeading({ level: 3 }).run() },
    "divider",
    { label: "Bulleted list", text: "• List", active: active.bullet, run: () => chain().toggleBulletList().run() },
    { label: "Numbered list", text: "1. List", active: active.ordered, run: () => chain().toggleOrderedList().run() },
  ];

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-3 py-2">
      {buttons.map((b, i) =>
        b === "divider" ? (
          <span key={i} className="mx-1 h-5 w-px bg-slate-200" />
        ) : (
          <button
            key={b.label}
            type="button"
            aria-label={b.label}
            title={b.label}
            aria-pressed={b.active}
            onMouseDown={(e) => e.preventDefault()} // keep the text selection/focus in the editor
            onClick={b.run}
            className={`min-w-9 rounded px-2 py-1 text-sm ${b.className ?? ""} ${b.active ? "bg-indigo-100 text-indigo-700" : "text-slate-700 hover:bg-slate-100"}`}
          >
            {b.text}
          </button>
        ),
      )}
    </div>
  );
}
