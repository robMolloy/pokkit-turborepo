import React from "react";
import { Input as CnInput } from "../ui/input";

type TCnInputProps = React.ComponentProps<typeof CnInput>;

export const Input = (p: TCnInputProps) => {
  return <CnInput {...p} />;
};

export const TextInput = (
  p: Omit<TCnInputProps, "type" | "onInput"> & {
    type: "text" | "password" | "email";
    onInput?: (value: string) => void;
  },
) => {
  const { onInput, ...rest } = p;

  return (
    <CnInput
      onInput={
        onInput ? (x) => onInput((x.target as unknown as { value: string }).value) : undefined
      }
      {...rest}
    />
  );
};
