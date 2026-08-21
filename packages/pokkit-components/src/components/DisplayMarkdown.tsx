import { cn } from "@repo/pokkit-shadcn";
import Markdown from "react-markdown";

const UNSAFE_URL_PROTOCOL_PATTERN = /^(javascript|data|vbscript|file):/i;

export const getSafeUrl = (url: string | undefined) => {
  if (!url) return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (UNSAFE_URL_PROTOCOL_PATTERN.test(trimmed)) return undefined;

  return trimmed;
};

export const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

export const DisplayMarkdown = (p: { markdown: string; className?: string }) => {
  return (
    <div className={cn("react-markdown", p.className)}>
      <Markdown
        components={{
          a: ({ children, href }) => {
            const safeHref = getSafeUrl(href);
            if (!safeHref) return <span>{children}</span>;

            if (isHttpUrl(safeHref)) {
              return (
                <a href={safeHref} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              );
            }

            return <a href={safeHref}>{children}</a>;
          },
          img: ({ src, alt }) => {
            const safeSrc = getSafeUrl(typeof src === "string" ? src : undefined);
            if (!safeSrc) return null;

            return (
              <>
                <img src={safeSrc} alt={alt ?? ""} />
                {alt ? (
                  <span className="my-2 border-l pl-2 text-sm italic opacity-75">{alt}</span>
                ) : null}
              </>
            );
          },
        }}
      >
        {p.markdown}
      </Markdown>
    </div>
  );
};
