import { Button as CnButton, cn } from "@repo/pokkit-shadcn";
import { CustomIcon } from "./CustomIcon";

type TCnButtonProps = React.ComponentProps<typeof CnButton>;

export const Button = (
  p: TCnButtonProps & { loading?: boolean; loadingContent?: React.ReactNode },
) => {
  const { className, loading, children, disabled, ...rest } = p;

  return (
    <CnButton
      className={cn("cursor-pointer", className)}
      disabled={disabled ? disabled : loading}
      {...rest}
    >
      {loading === undefined ? (
        p.children
      ) : (
        <div className="grid">
          <span
            className={cn(
              "col-start-1 row-start-1 flex justify-center items-center gap-2",
              !p.loading && "invisible",
            )}
          >
            <CustomIcon iconName="Loader" className="animate-spin" size="sm" />
            <span>{p.loadingContent ? p.loadingContent : p.children}</span>
          </span>
          <span className={cn("col-start-1 row-start-1", p.loading && "invisible")}>
            {p.children}
          </span>
        </div>
      )}
    </CnButton>
  );
};
