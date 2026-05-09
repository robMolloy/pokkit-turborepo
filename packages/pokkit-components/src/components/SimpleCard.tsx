export const SimpleCard = (p: { children?: React.ReactNode }) => {
  return <div className="border bg-card rounded-md p-3">{p.children}</div>;
};
