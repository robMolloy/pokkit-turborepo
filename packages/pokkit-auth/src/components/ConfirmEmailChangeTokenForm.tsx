import { Button, Field, FieldGroup, FieldLabel, Input } from "@repo/pokkit-shadcn";
import PocketBase from "pocketbase";
import { useState } from "react";
import { confirmEmailChange } from "../utils";

const inputIdPrefix = "confirm-email-change-token-form";

export const ConfirmEmailChangeTokenForm = (p: {
  pb: PocketBase;
  token: string;
  onConfirmEmailChangeSuccess?: (messages: string[]) => void;
  onConfirmEmailChangeError?: (messages: string[]) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        const resp = await confirmEmailChange({ pb: p.pb, token: p.token, password });
        const confirmEmailChangeFn = resp.success
          ? p.onConfirmEmailChangeSuccess
          : p.onConfirmEmailChangeError;
        confirmEmailChangeFn?.(resp.messages);
        setIsLoading(false);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-password-input`}>Existing password</FieldLabel>
          <Input
            id={`${inputIdPrefix}-password-input`}
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
            name="password"
            type="password"
            placeholder="Enter your existing password"
            required
          />
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Confirming Email Change..." : "Confirm Email Change"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
