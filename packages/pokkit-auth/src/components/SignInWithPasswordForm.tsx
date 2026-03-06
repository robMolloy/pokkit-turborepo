import { Button, Field, FieldGroup, FieldLabel, Input } from "@repo/pokkit-shadcn";
import PocketBase from "pocketbase";
import { useState } from "react";
import { signinWithPassword } from "../utils";

export const SignInWithPasswordForm = (p: {
  pb: PocketBase;
  onSignInSuccess?: (messages: string[]) => void;
  onSignInError?: (messages: string[]) => void;
  onForgotPasswordLinkClick: () => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        const resp = await signinWithPassword({ pb: p.pb, data: { email, password } });
        const fn = resp.success ? p.onSignInSuccess : p.onSignInError;
        fn?.(resp.messages);

        setIsLoading(false);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="signin-with-password-email-input">Email</FieldLabel>
          <Input
            autoFocus
            id="signin-with-password-email-input"
            value={email}
            onInput={(e) => setEmail(e.currentTarget.value)}
            name="email"
            type="email"
            placeholder="Enter your email"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="signin-with-password-password-input">Password</FieldLabel>
          <Input
            id="signin-with-password-password-input"
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
            name="password"
            type="password"
            placeholder="Enter your password"
            required
          />
        </Field>
        <Field orientation="horizontal" className="justify-between">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
          <Button variant="link" className="p-0 h-0" onClick={p.onForgotPasswordLinkClick}>
            Forgot your password?
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
