import { Button as CnButton, cn } from "@repo/pokkit-shadcn";

type TCnButtonProps = React.ComponentProps<typeof CnButton>;

export const Button = (p: TCnButtonProps) => {
  const { className, ...rest } = p;
  return <CnButton className={cn("cursor-pointer", className)} {...rest} />;
};
