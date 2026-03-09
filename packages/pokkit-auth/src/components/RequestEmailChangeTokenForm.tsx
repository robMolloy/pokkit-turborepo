import { Button, Field, FieldGroup, FieldLabel, Input } from "@repo/pokkit-shadcn";
import PocketBase from "pocketbase";
import { useState } from "react";
import { requestEmailChangeToken } from "../utils";

const inputIdPrefix = "request-email-change-token-form";

export const RequestEmailChangeTokenForm = (p: {
  pb: PocketBase;
  onRequestEmailChangeSuccess?: (messages: string[]) => void;
  onRequestEmailChangeError?: (messages: string[]) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        const resp = await requestEmailChangeToken({ pb: p.pb, email });
        const requestEmailChangeFn = resp.success
          ? p.onRequestEmailChangeSuccess
          : p.onRequestEmailChangeError;
        requestEmailChangeFn?.(resp.messages);

        setIsLoading(false);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-email-input`}>New email address</FieldLabel>
          <Input
            autoFocus
            id={`${inputIdPrefix}-email-input`}
            value={email}
            onInput={(e) => setEmail(e.currentTarget.value)}
            name="email"
            type="email"
            placeholder="Enter the new email"
            required
          />
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Requesting Email Change Token..." : "Request Email Change Token"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
