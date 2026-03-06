import React from "react";
import { Label as CnLabel } from "@repo/pokkit-shadcn";

type TCnLabelProps = React.ComponentProps<typeof CnLabel>;

export const Label = (p: TCnLabelProps) => {
  return <CnLabel {...p}>{p.children}</CnLabel>;
};
