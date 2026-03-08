import {
  Button,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  Input,
} from "@repo/pokkit-shadcn";
import PocketBase from "pocketbase";
import { useState } from "react";
import { confirmPasswordReset, requestPasswordReset, signinWithPassword } from "../utils";

const inputIdPrefix = "sign-in-with-password-reset-request-and-confirm-form";

export const SignInWithPasswordResetRequestAndConfirmForm = (p: {
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
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordResetToken, setPasswordResetToken] = useState("");
  const [isPasswordResetTokenRequested, setIsPasswordResetTokenRequested] = useState(false);

  const mode = isPasswordResetTokenRequested ? "email-confirmed" : "edit-email";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        if (mode === "edit-email") {
          const resp = await requestPasswordReset({ pb: p.pb, email });
          if (resp.success) setIsPasswordResetTokenRequested(true);
          const requestPasswordResetfn = resp.success
            ? p.onRequestPasswordResetSuccess
            : p.onRequestPasswordResetError;
          requestPasswordResetfn?.(resp.messages);
        } else if (mode === "email-confirmed") {
          const resp = await confirmPasswordReset({
            pb: p.pb,
            data: { token: passwordResetToken, password, passwordConfirm },
          });

          const confirmPasswordResetFn = resp.success
            ? p.onConfirmPasswordResetSuccess
            : p.onConfirmPasswordResetError;
          confirmPasswordResetFn?.(resp.messages);

          if (resp.success) {
            const resp = await signinWithPassword({ pb: p.pb, data: { email, password } });
            const signInFn = resp.success ? p.onSignInSuccess : p.onSignInError;
            signInFn?.(resp.messages);
          }
        }

        setIsLoading(false);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-email-input`}>Email</FieldLabel>
          <div className="relative">
            <Input
              autoFocus
              key={passwordResetToken} // remount input when otpId to enable autoFocus
              id={`${inputIdPrefix}-email-input`}
              value={email}
              onInput={(e) => setEmail(e.currentTarget.value)}
              disabled={isLoading || mode === "email-confirmed"}
              name="email"
              type="email"
              placeholder="Enter your email"
              required
            />
            {mode === "email-confirmed" && (
              <Button
                type="button"
                size="sm"
                variant="link"
                onClick={() => {
                  setIsPasswordResetTokenRequested(false);
                  setPasswordResetToken("");
                  setPassword("");
                  setPasswordConfirm("");
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2"
              >
                Change
              </Button>
            )}
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-reset-token-input`}>Reset token</FieldLabel>
          <FieldDescription>
            Copy the reset token from your email and paste it below
          </FieldDescription>
          <Input
            autoFocus
            key={passwordResetToken} // remount input when otpId to enable autoFocus
            id={`${inputIdPrefix}-reset-token-input`}
            value={passwordResetToken}
            onInput={(e) => setPasswordResetToken(e.currentTarget.value)}
            disabled={isLoading || mode === "edit-email"}
            name="password-reset-token"
            type="text"
            placeholder="Enter your reset token"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-password-input`}>New password</FieldLabel>
          <Input
            id={`${inputIdPrefix}-password-input`}
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
            disabled={isLoading || mode === "edit-email"}
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
            disabled={isLoading || mode === "edit-email"}
            name="password-confirm"
            type="password"
            placeholder="Confirm your new password"
            required
          />
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={isLoading}>
            {(() => {
              if (mode === "edit-email")
                return isLoading ? "Requesting Reset Token..." : "Request Reset Token";
              return isLoading ? "Signing in..." : "Sign In";
            })()}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
