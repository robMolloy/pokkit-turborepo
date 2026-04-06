import React from "react";
import { Input as CnInput } from "@repo/pokkit-shadcn";

type TCnInputProps = React.ComponentProps<typeof CnInput>;

export const Input = (p: TCnInputProps) => {
  return <CnInput {...p} />;
};

export const TextInput = (
  p: Omit<TCnInputProps, "type"> & {
    type: "text" | "password" | "email";
    onValueChange?: (value: string) => void;
  },
) => {
  const { onValueChange, onInput, ...rest } = p;

  return (
    <CnInput
      onInput={(evt) => {
        onInput?.(evt);
        onValueChange?.((evt.target as unknown as { value: string }).value);
      }}
      {...rest}
    />
  );
};
export const NumberInput = (
  p: Omit<TCnInputProps, "type"> & {
    onValueChange?: (value: number) => void;
  },
) => {
  const { onValueChange, onInput, ...rest } = p;

  return (
    <CnInput
      type="number"
      onInput={(evt) => {
        onInput?.(evt);
        if (!onValueChange) return;

        const unparsedValue = (evt.target as unknown as { value: string }).value;
        const parsedValue = parseInt(unparsedValue, 10);
        const rtn = (() => {
          if (isNaN(parsedValue)) return 0;
          if (unparsedValue === "-") return -0;
          return parsedValue;
        })();

        onValueChange(rtn);
      }}
      {...rest}
    />
  );
};
