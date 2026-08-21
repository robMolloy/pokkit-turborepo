import { Button, Field, FieldGroup, FieldLabel, Input } from "@repo/pokkit-shadcn";
import PocketBase from "pocketbase";
import { useState } from "react";
import { confirmPasswordReset, signinWithPassword } from "../../lib";

const inputIdPrefix = "sign-in-with-password-reset-token-form";

export const SignInWithPasswordResetTokenForm = (p: {
  pb: PocketBase;
  initEmailValue: string;
  initPasswordResetTokenValue: string;
  onConfirmPasswordResetSuccess?: (messages: string[]) => void;
  onConfirmPasswordResetError?: (messages: string[]) => void;
  onSignInSuccess?: (messages: string[]) => void;
  onSignInError?: (messages: string[]) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        const resp = await confirmPasswordReset({
          pb: p.pb,
          data: { token: p.initPasswordResetTokenValue, password, passwordConfirm },
        });

        const confirmPasswordResetFn = resp.success
          ? p.onConfirmPasswordResetSuccess
          : p.onConfirmPasswordResetError;
        confirmPasswordResetFn?.(resp.messages);

        if (resp.success) {
          const resp = await signinWithPassword({
            pb: p.pb,
            data: { email: p.initEmailValue, password },
          });
          const signInFn = resp.success ? p.onSignInSuccess : p.onSignInError;
          signInFn?.(resp.messages);
        }

        setIsLoading(false);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-email-input`}>Email</FieldLabel>
          <Input
            autoFocus
            id={`${inputIdPrefix}-email-input`}
            value={p.initEmailValue}
            disabled
            name="email"
            type="email"
            placeholder="Enter your email"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-password-input`}>New password</FieldLabel>
          <Input
            autoFocus
            id={`${inputIdPrefix}-password-input`}
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
            disabled={isLoading}
            name="password"
            type="password"
            placeholder="Enter your new password"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-password-confirm-input`}>
            Confirm new password
          </FieldLabel>
          <Input
            id={`${inputIdPrefix}-password-confirm-input`}
            value={passwordConfirm}
            onInput={(e) => setPasswordConfirm(e.currentTarget.value)}
            disabled={isLoading}
            name="password-confirm"
            type="password"
            placeholder="Confirm your new password"
            required
          />
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Changing password..." : "Change password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
