import React from "react";
import { Input as CnInput } from "../ui/input";

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
