import {
  Button,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@repo/pokkit-shadcn";
import PocketBase from "pocketbase";
import { useState } from "react";
import { requestOtpForSignInWithOtp, signinWithOtp, signUpWithPassword } from "../utils";

const DigitsOnlyRegex = /^\d*$/;

const inputIdPrefix = "sign-up-with-otp";

export const SignUpWithOtpForm = (p: {
  pb: PocketBase;
  onRequestOtpSuccess?: (messages: string[]) => void;
  onRequestOtpError?: (messages: string[]) => void;
  onSignInSuccess?: (messages: string[]) => void;
  onSignInError?: (messages: string[]) => void;
  onSignUpSuccess?: (messages: string[]) => void;
  onSignUpError?: (messages: string[]) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otpId, setOtpId] = useState("");
  const [otp, setOtp] = useState("");

  const mode = otpId ? "edit-otp" : "edit-email";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        if (mode === "edit-email") {
          const password = crypto.randomUUID();
          const signUpResp = await signUpWithPassword({
            pb: p.pb,
            data: { email, name, emailVisibility: true, password, passwordConfirm: password },
          });
          const signUpFn = signUpResp.success ? p.onSignUpSuccess : p.onSignUpError;
          signUpFn?.(signUpResp.messages);

          if (signUpResp.success) {
            const requestOtpResp = await requestOtpForSignInWithOtp({ pb: p.pb, email });
            if (requestOtpResp.success) setOtpId(requestOtpResp.data.otpId);
            const requestOtpFn = requestOtpResp.success
              ? p.onRequestOtpSuccess
              : p.onRequestOtpError;
            requestOtpFn?.(requestOtpResp.messages);
          }
        } else if (mode === "edit-otp") {
          const resp = await signinWithOtp({ pb: p.pb, data: { otpId, otp } });

          const fn = resp.success ? p.onSignInSuccess : p.onSignInError;
          fn?.(resp.messages);
        }

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
          <div className="relative">
            <Input
              autoFocus
              key={otpId} // remount input when otpId to enable autoFocus
              id={`${inputIdPrefix}-email-input`}
              value={email}
              onInput={(e) => setEmail(e.currentTarget.value)}
              disabled={isLoading || mode === "edit-otp"}
              name="email"
              type="email"
              placeholder="Enter your email"
              required
            />
            {mode === "edit-otp" && (
              <Button
                type="button"
                size="sm"
                variant="link"
                onClick={() => {
                  setOtpId("");
                  setOtp("");
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2"
              >
                Change
              </Button>
            )}
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${inputIdPrefix}-otp-input`}>OTP</FieldLabel>
          <div>
            <InputOTP
              autoFocus
              key={otpId} // remount input when otpId to enable autoFocus
              id={`${inputIdPrefix}-otp-input`}
              disabled={isLoading || mode === "edit-email"}
              name="signin-otp"
              maxLength={8}
              value={otp}
              onChange={(e) => setOtp(e)}
              pattern={DigitsOnlyRegex.source}
              required
            >
              <InputOTPGroup className="w-full">
                {[...Array(8)].map((_, index) => (
                  <InputOTPSlot key={index} index={index} className="flex-1 h-14" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={isLoading}>
            {(() => {
              if (mode === "edit-email") return isLoading ? "Requesting OTP..." : "Request OTP";
              return isLoading ? "Signing in..." : "Sign In";
            })()}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
