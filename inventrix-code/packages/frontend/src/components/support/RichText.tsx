import { Fragment } from "react";
import type { ReactNode } from "react";

interface RichTextProps {
  text: string;
}

/** Renders **bold** spans as React nodes; never injects HTML. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-bold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

type Block =
  { kind: "paragraph"; lines: string[] } | { kind: "list"; items: string[] };

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split("\n")) {
    const last = blocks[blocks.length - 1];
    if (!line.trim()) {
      blocks.push({ kind: "paragraph", lines: [] });
    } else if (BULLET.test(line)) {
      const item = line.replace(BULLET, "");
      if (last?.kind === "list") last.items.push(item);
      else blocks.push({ kind: "list", items: [item] });
    } else if (last?.kind === "paragraph") {
      last.lines.push(line);
    } else {
      blocks.push({ kind: "paragraph", lines: [line] });
    }
  }
  return blocks.filter((b) =>
    b.kind === "list" ? b.items.length > 0 : b.lines.length > 0,
  );
}

/** Minimal markdown for assistant replies: paragraphs, bullet lists, bold. */
export default function RichText({ text }: RichTextProps) {
  return (
    <div className="flex flex-col gap-2">
      {toBlocks(text).map((block, i) =>
        block.kind === "list" ? (
          <ul key={i} className="flex flex-col gap-1">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2">
                <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-neon-cyan shadow-neon-cyan" />
                <span>{inline(item)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {inline(block.lines.join("\n"))}
          </p>
        ),
      )}
    </div>
  );
}
