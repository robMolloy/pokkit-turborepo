const colorClassNameLookup = {
  red: "bg-destructive-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
};

export const StatusIndicator = (p: { color: keyof typeof colorClassNameLookup }) => {
  return <div className={`h-2.5 w-2.5 rounded-full ${colorClassNameLookup[p.color]}`} />;
};
