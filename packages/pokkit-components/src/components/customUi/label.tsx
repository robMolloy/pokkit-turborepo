import React from "react";
import { Label as CnLabel } from "../ui/label";

type TCnLabelProps = React.ComponentProps<typeof CnLabel>;

export const Label = (p: TCnLabelProps) => {
  return <CnLabel {...p}>{p.children}</CnLabel>;
};
