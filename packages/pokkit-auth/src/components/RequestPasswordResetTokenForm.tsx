import { Button, Field, FieldGroup, FieldLabel, Input } from "@repo/pokkit-shadcn";
import PocketBase from "pocketbase";
import { useState } from "react";
import { requestPasswordReset } from "../utils";

const inputIdPrefix = "request-password-reset-token-form";

export const RequestPasswordResetTokenForm = (p: {
  pb: PocketBase;
  onRequestPasswordResetSuccess?: (messages: string[]) => void;
  onRequestPasswordResetError?: (messages: string[]) => void;
  onConfirmPasswordResetSuccess?: (messages: string[]) => void;
  onConfirmPasswordResetError?: (messages: string[]) => void;
  onSignInSuccess?: (messages: string[]) => void;
  onSignInError?: (messages: string[]) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        const resp = await requestPasswordReset({ pb: p.pb, email });
        const requestPasswordResetFn = resp.success
          ? p.onRequestPasswordResetSuccess
          : p.onRequestPasswordResetError;
        requestPasswordResetFn?.(resp.messages);

        setIsLoading(false);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-email-input`}>Email</FieldLabel>
          <Input
            autoFocus
            id={`${inputIdPrefix}-email-input`}
            value={email}
            onInput={(e) => setEmail(e.currentTarget.value)}
            disabled={isLoading}
            name="email"
            type="email"
            placeholder="Enter your email"
            required
          />
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Requesting Reset Token..." : "Request Reset Token"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
