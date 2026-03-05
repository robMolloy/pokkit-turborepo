import { Button, Label, TextInput } from "@repo/pokkit-components";
import { useState } from "react";
import PocketBase from "pocketbase";
import { signUpWithPassword } from "../utils";

export const SignUpWithPasswordForm = (p: {
  pb: PocketBase;
  onSignInSuccess?: (messages: string[]) => void;
  onSignInError?: (messages: string[]) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        const resp = await signUpWithPassword({
          pb: p.pb,
          data: { email, name, emailVisibility: true, password, passwordConfirm },
        });
        const fn = resp.success ? p.onSignInSuccess : p.onSignInError;
        fn?.(resp.messages);

        setIsLoading(false);
      }}
    >
      <div>
        <Label htmlFor="sign-up-with-password-name-input">Full Name</Label>
        <TextInput
          id="sign-up-with-password-name-input"
          value={name}
          onValueChange={setName}
          disabled={isLoading}
          name="name"
          type="text"
          placeholder="Enter your full name"
          required
        />
      </div>
      <div>
        <Label htmlFor="sign-up-with-password-email-input">Email</Label>
        <TextInput
          id="sign-up-with-password-email-input"
          value={email}
          onValueChange={setEmail}
          disabled={isLoading}
          name="email"
          type="email"
          placeholder="Enter your email"
          required
        />
      </div>
      <div>
        <Label htmlFor="sign-up-with-password-password-input">Password</Label>
        <TextInput
          id="sign-up-with-password-password-input"
          value={password}
          onValueChange={setPassword}
          disabled={isLoading}
          name="signup-password"
          type="password"
          placeholder="Create a password"
          required
        />
      </div>
      <div>
        <Label htmlFor="sign-up-with-password-password-confirm-input">Confirm Password</Label>
        <TextInput
          id="sign-up-with-password-password-confirm-input"
          value={passwordConfirm}
          onValueChange={setPasswordConfirm}
          disabled={isLoading}
          name="password-confirm"
          type="password"
          placeholder="Confirm your password"
          required
        />
      </div>
      <Button variant="secondary" type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating account..." : "Sign Up"}
      </Button>
    </form>
  );
};
