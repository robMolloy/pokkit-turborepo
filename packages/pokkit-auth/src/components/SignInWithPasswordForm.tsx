import { Button, Label, Input } from "@repo/pokkit-shadcn";
import { useState } from "react";
import PocketBase from "pocketbase";
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
        <Input
          id="signin-with-password-email-input"
          value={email}
          onInput={(e) => setEmail(e.currentTarget.value)}
          name="email"
          type="email"
          placeholder="Enter your email"
          required
        />
      </div>
      <div>
        <Label htmlFor="signin-with-password-password-input">Password</Label>
        <Input
          id="signin-with-password-password-input"
          value={password}
          onInput={(e) => setPassword(e.currentTarget.value)}
          name="password"
          type="password"
          placeholder="Enter your password"
          required
        />
      </div>

      <Button
        variant="link"
        className="text-muted-foreground"
        onClick={p.onForgotPasswordLinkClick}
      >
        Forgot your password?
      </Button>
      <Button variant="secondary" type="submit" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
};
