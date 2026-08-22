import Markdown from "react-markdown";

export const DisplayMarkdown = (p: { children: string }) => {
  return (
    <div className="react-markdown">
      <Markdown
        components={{
          a: ({ children, href }) => {
            if (!href) return <a>{children}</a>;
            if (href?.startsWith("http"))
              return (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              );

            return <a href={href}>{children}</a>;
          },
          img: ({ src, alt }) => (
            <>
              <img src={src} alt={alt} />
              {alt && <span className="my-2 border-l pl-2 text-sm italic opacity-75">{alt}</span>}
            </>
          ),
        }}
      >
        {p.children}
      </Markdown>
    </div>
  );
};
