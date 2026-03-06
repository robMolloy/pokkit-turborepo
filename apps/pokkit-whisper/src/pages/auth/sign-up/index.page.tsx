import { pb } from "@/config/pocketbaseConfig";
import {
  listAuthMethods,
  SignedOutRouteProtector,
  SignUpNavigationOptions,
} from "@repo/pokkit-auth";
import type { AuthMethodsList } from "pocketbase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Page() {
  const [authMethodsList, setAuthMethodsList] = useState<AuthMethodsList | null | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const resp = await listAuthMethods({ pb });
      setAuthMethodsList(resp.success ? resp.data : null);
    })();
  }, []);

  if (authMethodsList === null) return <div>Failed to load auth methods</div>;
  if (authMethodsList === undefined) return <div>Loading...</div>;
  return (
    <SignedOutRouteProtector>
      <SignUpNavigationOptions
        authMethodsList={authMethodsList}
        onSignUpWithOauth2ButtonClick={() => navigate("/auth/sign-up/oauth2")}
        onSignUpWithPasswordButtonClick={() => navigate("/auth/sign-up/password")}
        onNavigateToSignInLinkClick={function (): void {
          throw new Error("Function not implemented.");
        }}
      />
    </SignedOutRouteProtector>
  );
}
