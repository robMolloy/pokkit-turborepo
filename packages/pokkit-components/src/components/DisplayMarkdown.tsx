import { Fragment, type ReactNode } from "react";

const UNSAFE_URL_PROTOCOL_PATTERN = /^(javascript|data|vbscript|file):/i;

const getSafeUrl = (url: string | undefined) => {
  if (!url) return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (UNSAFE_URL_PROTOCOL_PATTERN.test(trimmed)) return undefined;

  return trimmed;
};

const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

const MarkdownLink = (p: { href?: string; children: ReactNode }) => {
  const safeHref = getSafeUrl(p.href);
  if (!safeHref) return <span>{p.children}</span>;

  if (isHttpUrl(safeHref)) {
    return (
      <a href={safeHref} target="_blank" rel="noopener noreferrer">
        {p.children}
      </a>
    );
  }

  return <a href={safeHref}>{p.children}</a>;
};

const MarkdownImage = (p: { src?: string; alt?: string }) => {
  const safeSrc = getSafeUrl(p.src);
  if (!safeSrc) return null;

  return (
    <>
      <img src={safeSrc} alt={p.alt ?? ""} />
      {p.alt ? <span className="my-2 border-l pl-2 text-sm italic opacity-75">{p.alt}</span> : null}
    </>
  );
};

const INLINE_PATTERN =
  /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

const renderInline = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  const pattern = new RegExp(INLINE_PATTERN.source, INLINE_PATTERN.flags);

  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined) continue;

    if (match.index > lastIndex) {
      nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      nodes.push(<MarkdownImage key={key++} alt={match[1]} src={match[2]} />);
    } else if (match[3] !== undefined && match[4] !== undefined) {
      nodes.push(
        <MarkdownLink key={key++} href={match[4]}>
          {match[3]}
        </MarkdownLink>,
      );
    } else if (match[5] !== undefined) {
      nodes.push(<code key={key++}>{match[5]}</code>);
    } else if (match[6] !== undefined) {
      nodes.push(<strong key={key++}>{match[6]}</strong>);
    } else if (match[7] !== undefined) {
      nodes.push(<em key={key++}>{match[7]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes;
};

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type Block =
  | { type: "heading"; level: HeadingLevel; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "code"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "hr" };

const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const UNORDERED_ITEM_PATTERN = /^[-*]\s+(.*)$/;
const ORDERED_ITEM_PATTERN = /^\d+\.\s+(.*)$/;

const parseBlocks = (markdown: string): Block[] => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    if (line.trim() === "---" || line.trim() === "***") {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        code.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    const heading = line.match(HEADING_PATTERN);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as HeadingLevel,
        text: heading[2] ?? "",
      });
      i += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith("> ")) {
        quote.push((lines[i] ?? "").slice(2));
        i += 1;
      }
      blocks.push({ type: "quote", text: quote.join("\n") });
      continue;
    }

    const unorderedItem = line.match(UNORDERED_ITEM_PATTERN);
    const orderedItem = line.match(ORDERED_ITEM_PATTERN);
    if (unorderedItem || orderedItem) {
      const ordered = Boolean(orderedItem);
      const items: string[] = [];
      while (i < lines.length) {
        const itemMatch = (lines[i] ?? "").match(
          ordered ? ORDERED_ITEM_PATTERN : UNORDERED_ITEM_PATTERN,
        );
        if (!itemMatch) break;
        items.push(itemMatch[1] ?? "");
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length) {
      const current = lines[i] ?? "";
      if (
        current.trim() === "" ||
        current.startsWith("```") ||
        current.startsWith("> ") ||
        HEADING_PATTERN.test(current) ||
        UNORDERED_ITEM_PATTERN.test(current) ||
        ORDERED_ITEM_PATTERN.test(current)
      ) {
        break;
      }
      paragraph.push(current);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join("\n") });
  }

  return blocks;
};

const Heading = (p: { level: HeadingLevel; children: ReactNode }) => {
  const Tag = `h${p.level}` as const;
  return <Tag>{p.children}</Tag>;
};

const renderBlock = (block: Block, key: number) => {
  if (block.type === "heading") {
    return (
      <Heading key={key} level={block.level}>
        {renderInline(block.text)}
      </Heading>
    );
  }

  if (block.type === "quote") {
    return <blockquote key={key}>{renderInline(block.text)}</blockquote>;
  }

  if (block.type === "code") {
    return (
      <pre key={key}>
        <code>{block.text}</code>
      </pre>
    );
  }

  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag key={key}>
        {block.items.map((item, itemKey) => (
          <li key={itemKey}>{renderInline(item)}</li>
        ))}
      </Tag>
    );
  }

  if (block.type === "hr") return <hr key={key} />;

  return <p key={key}>{renderInline(block.text)}</p>;
};

export const DisplayMarkdown = (p: { markdown: string; className?: string }) => {
  return (
    <div className={["react-markdown", p.className].filter(Boolean).join(" ")}>
      {parseBlocks(p.markdown).map(renderBlock)}
    </div>
  );
};
