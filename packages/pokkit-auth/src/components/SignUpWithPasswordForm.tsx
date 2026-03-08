import { Button, Field, FieldGroup, FieldLabel, Input } from "@repo/pokkit-shadcn";
import PocketBase from "pocketbase";
import { useState } from "react";
import { signUpWithPassword } from "../utils";

const inputIdPrefix = "sign-up-with-password-form";

export const SignUpWithPasswordForm = (p: {
  pb: PocketBase;
  onSignUpSuccess?: (messages: string[]) => void;
  onSignUpError?: (messages: string[]) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        const resp = await signUpWithPassword({
          pb: p.pb,
          data: { email, name, emailVisibility: true, password, passwordConfirm },
        });
        const fn = resp.success ? p.onSignUpSuccess : p.onSignUpError;
        fn?.(resp.messages);

        setIsLoading(false);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-name-input`}>Full Name</FieldLabel>
          <Input
            id={`${inputIdPrefix}-name-input`}
            value={name}
            onInput={(e) => setName(e.currentTarget.value)}
            disabled={isLoading}
            name="name"
            type="text"
            placeholder="Enter your full name"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-email-input`}>Email</FieldLabel>
          <Input
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
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-password-input`}>Password</FieldLabel>
          <Input
            id={`${inputIdPrefix}-password-input`}
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
            disabled={isLoading}
            name="signup-password"
            type="password"
            placeholder="Create a password"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-password-confirm-input`}>
            Confirm Password
          </FieldLabel>
          <Input
            id={`${inputIdPrefix}-password-confirm-input`}
            value={passwordConfirm}
            onInput={(e) => setPasswordConfirm(e.currentTarget.value)}
            disabled={isLoading}
            name="password-confirm"
            type="password"
            placeholder="Confirm your password"
            required
          />
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Sign Up"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
