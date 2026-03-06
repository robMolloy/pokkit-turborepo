import { Button } from "@repo/pokkit-components";
import { AuthMethodsList } from "pocketbase";

export const SignUpNavigationOptions = (p: {
  authMethodsList: AuthMethodsList;
  onSignUpWithOauth2ButtonClick: () => void;
  onSignUpWithPasswordButtonClick: () => void;
}) => {
  return (
    <div className="flex flex-col gap-4">
      {p.authMethodsList.oauth2.enabled && (
        <Button className="w-full" onClick={p.onSignUpWithOauth2ButtonClick}>
          Sign up with oAuth2
        </Button>
      )}
      {p.authMethodsList.password.enabled && (
        <Button className="w-full" onClick={p.onSignUpWithPasswordButtonClick}>
          Sign up with password
        </Button>
      )}
    </div>
  );
};
