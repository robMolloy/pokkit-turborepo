import { Button } from "@repo/pokkit-components";
import { AuthMethodsList } from "pocketbase";

export const SignInNavigationOptions = (p: {
  authMethodsList: AuthMethodsList;
  onSignInWithOtpButtonClick: () => void;
  onSignInWithOauth2ButtonClick: () => void;
  onSignInWithPasswordButtonClick: () => void;
  onForgotPasswordLinkClick: () => void;
  onNavigateToSignUpLinkClick: () => void;
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

      <span className="flex justify-center items-center gap-2">
        Already have an account?{" "}
        <Button
          variant="link"
          className="text-muted-foreground text-md p-0"
          onClick={p.onNavigateToSignUpLinkClick}
        >
          Sign up
        </Button>
      </span>
    </div>
  );
};
