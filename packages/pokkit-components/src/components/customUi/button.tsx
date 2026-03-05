import { cn } from "../../lib/utils";
import { Button as CnButton } from "../ui/button";

type TCnButtonProps = React.ComponentProps<typeof CnButton>;

export const Button = (p: TCnButtonProps) => {
  const { className, ...rest } = p;
  return <CnButton className={cn("cursor-pointer", className)} {...rest} />;
};
