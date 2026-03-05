import { useReactiveAuthStore, useReactiveAuthStoreSync } from "@repo/pokkit-auth";
import PocketBase from "pocketbase";
import { useState } from "react";
import { signinWithPassword } from "../utils/dbAuthHelpers";
import { Button, Label, TextInput } from "@repo/pokkit-components";

const pb = new PocketBase("http://127.0.0.1:8090");

export const SigninWithPasswordForm = (p: {
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
          onInput={setEmail}
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
          onInput={setPassword}
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

const IndexPage = () => {
  useReactiveAuthStoreSync({ pb });
  const authStore = useReactiveAuthStore();

  return (
    <div>
      <h1>Pokkit Whisper</h1>
      <SigninWithPasswordForm pb={pb} />
      <pre>{JSON.stringify({ authStore }, undefined, 2)}</pre>
    </div>
  );
};

export default IndexPage;
