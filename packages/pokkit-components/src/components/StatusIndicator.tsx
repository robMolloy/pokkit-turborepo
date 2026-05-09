export const StatusIndicator = (p: { color: "red" | "green" }) => {
  return (
    <div
      className={`h-2.5 w-2.5 rounded-full ${p.color === "green" ? "bg-emerald-500" : "bg-destructive"}`}
    />
  );
};
