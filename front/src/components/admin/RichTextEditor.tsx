"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { cn } from "@/lib/utils";

import { MediaPicker } from "./MediaPicker";

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 cursor-pointer items-center justify-center rounded-[4px] border-0 text-navy-950 transition-colors",
        active ? "bg-navy-950 text-white" : "bg-transparent hover:bg-mist",
      )}
    >
      {children}
    </button>
  );
}

/** Визуальный редактор статей (TipTap). HTML дополнительно очищается на сервере. */
export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
      Image,
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: { attributes: { class: "prose-rms min-h-[360px] px-4 py-3 outline-none" } },
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
          }
        : null,
  });

  if (!editor) return <div className="min-h-[420px] rounded-[4px] border border-line bg-white" />;

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Адрес ссылки (пусто — убрать ссылку)", previous ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="overflow-hidden rounded-[4px] border border-line bg-white focus-within:border-accent">
      <div
        role="toolbar"
        aria-label="Форматирование"
        className="flex flex-wrap gap-0.5 border-b border-line bg-paper p-1"
      >
        <ToolButton label="Жирный" active={state?.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-4" />
        </ToolButton>
        <ToolButton label="Курсив" active={state?.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-4" />
        </ToolButton>
        <ToolButton
          label="Заголовок 2"
          active={state?.h2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolButton>
        <ToolButton
          label="Заголовок 3"
          active={state?.h3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolButton>
        <ToolButton
          label="Маркированный список"
          active={state?.bullet}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolButton>
        <ToolButton
          label="Нумерованный список"
          active={state?.ordered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolButton>
        <ToolButton
          label="Цитата"
          active={state?.quote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolButton>
        <ToolButton label="Ссылка" active={state?.link} onClick={setLink}>
          <Link2 className="size-4" />
        </ToolButton>
        <ToolButton label="Изображение" onClick={() => setPickerOpen(true)}>
          <ImageIcon className="size-4" />
        </ToolButton>
        <span className="mx-1 w-px bg-line" />
        <ToolButton label="Отменить" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="size-4" />
        </ToolButton>
        <ToolButton label="Повторить" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="size-4" />
        </ToolButton>
      </div>
      <EditorContent editor={editor} />
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(m) =>
          editor
            .chain()
            .focus()
            .setImage({ src: m.url, alt: m.alt || m.original_name })
            .run()
        }
      />
    </div>
  );
}
