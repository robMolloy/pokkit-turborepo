import { Button, Label, TextInput } from "@repo/pokkit-components";
import { useState } from "react";
import PocketBase from "pocketbase";
import { signinWithPassword } from "../utils";

export const SignInWithPasswordForm = (p: {
  pb: PocketBase;
  onSignInSuccess?: (messages: string[]) => void;
  onSignInError?: (messages: string[]) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
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
      <div>
        <Label htmlFor="signin-with-password-email-input">Email</Label>
        <TextInput
          id="signin-with-password-email-input"
          value={email}
          onValueChange={setEmail}
          name="email"
          type="email"
          placeholder="Enter your email"
          required
        />
      </div>
      <div>
        <Label htmlFor="signin-with-password-password-input">Password</Label>
        <TextInput
          id="signin-with-password-password-input"
          value={password}
          onValueChange={setPassword}
          name="password"
          type="password"
          placeholder="Enter your password"
          required
        />
      </div>
      <Button variant="secondary" type="submit" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
};
