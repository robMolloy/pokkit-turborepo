import { Button } from "@repo/pokkit-components";
import { AuthMethodsList } from "pocketbase";

export const SignInNavigationOptions = (p: {
  authMethodsList: AuthMethodsList;
  onSignInWithOtpButtonClick: () => void;
  onSignInWithOauth2ButtonClick: () => void;
  onSignInWithPasswordButtonClick: () => void;
  onForgotPasswordLinkClick: () => void;
}) => {
  return (
    <div className="flex flex-col gap-4">
      {p.authMethodsList.otp.enabled && (
        <Button className="w-full" onClick={p.onSignInWithOtpButtonClick}>
          Sign in with OTP
        </Button>
      )}
      {p.authMethodsList.oauth2.enabled && (
        <Button className="w-full" onClick={p.onSignInWithOauth2ButtonClick}>
          Sign in with oAuth2
        </Button>
      )}
      {p.authMethodsList.password.enabled && (
        <Button className="w-full" onClick={p.onSignInWithPasswordButtonClick}>
          Sign in with password
        </Button>
      )}
      <Button
        variant="link"
        className="text-muted-foreground text-sm"
        onClick={p.onForgotPasswordLinkClick}
      >
        Forgot your password?
      </Button>
    </div>
  );
};
