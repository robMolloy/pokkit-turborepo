export const SimpleCard = (initProps: React.ComponentProps<"div">) => {
  const { className, ...p } = initProps;
  return (
    <div className={`border bg-card rounded-md p-3 ${className}`} {...p}>
      {p.children}
    </div>
  );
};
