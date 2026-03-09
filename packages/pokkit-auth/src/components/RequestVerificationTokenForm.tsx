import { Button, Field, FieldGroup } from "@repo/pokkit-shadcn";
import PocketBase from "pocketbase";
import { useState } from "react";
import { requestVerificationToken } from "../utils";

// const inputIdPrefix = "request-verification-token-form";

export const RequestVerificationTokenForm = (p: {
  pb: PocketBase;
  email: string;
  onRequestVerificationSuccess?: (messages: string[]) => void;
  onRequestVerificationError?: (messages: string[]) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        const resp = await requestVerificationToken({ pb: p.pb, email: p.email });
        const requestVerificationFn = resp.success
          ? p.onRequestVerificationSuccess
          : p.onRequestVerificationError;
        requestVerificationFn?.(resp.messages);

        setIsLoading(false);
      }}
    >
      <FieldGroup>
        <Field orientation="horizontal">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Requesting Verification Token..." : "Request Verification Token"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
