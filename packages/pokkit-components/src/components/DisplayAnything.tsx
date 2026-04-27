import { useState } from "react";

export const DisplayAnyObject = (p: {
  data: unknown[] | Record<string, unknown>;
  level: number;
  title: string;
  hideFunctions: boolean;
  expandLevel: number;
}) => {
  const [isOpen, setIsOpen] = useState(p.level <= p.expandLevel);

  const isArray = Array.isArray(p.data);
  const leftBracket = isArray ? "[" : "{";
  const rightBracket = isArray ? "]" : "}";

  return (
    <details
      className="cursor-pointer"
      onToggle={(evt) => {
        evt.stopPropagation();
        const e = evt as unknown as { target: { open: boolean } };
        setIsOpen(e.target.open);
      }}
      open={isOpen}
    >
      <summary>
        {p.title && <strong>{p.title}:</strong>}{" "}
        {`${leftBracket}${isOpen ? "" : `...${rightBracket}`}`}
      </summary>
      <div>
        <div
          style={{ marginLeft: `4px`, paddingLeft: "20px" }}
          className="border-l border-white border-opacity-25"
        >
          {Object.entries(p.data).map(([k, v]) => {
            if (typeof v === "function" && p.hideFunctions) return <></>;

            return (
              <DisplayAnything
                key={`level-${p.level}-key-${k}`}
                data={v}
                level={p.level + 1}
                title={k}
                hideFunctions={p.hideFunctions}
                expandLevel={p.expandLevel}
              />
            );
          })}
        </div>
      </div>
      <div>{rightBracket}</div>
    </details>
  );
};

export const DisplayAnything = (p: {
  data: unknown;
  level?: number;
  title: string;
  hideFunctions: boolean;
  expandLevel: number;
}) => {
  if (p.data === null || typeof p.data !== "object")
    return (
      <div>
        -&nbsp;&nbsp;
        <strong>{p.title}:</strong> {String(typeof p.data === "function" ? "() => {}" : p.data)}
      </div>
    );

  return (
    <DisplayAnyObject
      data={p.data as unknown[] | Record<string, unknown>}
      level={(p.level ?? 0) + 1}
      title={p.title}
      hideFunctions={p.hideFunctions}
      expandLevel={p.expandLevel}
    />
  );
};
