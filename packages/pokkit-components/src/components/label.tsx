import React from "react";
import { Label as CnLabel } from "@repo/pokkit-shadcn";

type TCnLabelProps = React.ComponentProps<typeof CnLabel>;

export const Label = (p: TCnLabelProps) => {
  return <CnLabel {...p}>{p.children}</CnLabel>;
};
export const InputLabel = (initProps: TCnLabelProps) => {
  const { className, ...p } = initProps;
  return (
    <CnLabel className={`mb-1 ${className}`} {...p}>
      {p.children}
    </CnLabel>
  );
};
