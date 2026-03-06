import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [authMethodsList, setAuthMethodsList] = useState<AuthMethodsList | null | undefined>(
    undefined,
  );
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
      <Card className="w-full max-w-md mx-auto mt-16">
        <CardHeader>
          <CardTitle>Sign Up for an account</CardTitle>
          <CardDescription>Choose your preferred sign-up method</CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpNavigationOptions
            authMethodsList={authMethodsList}
            onSignUpWithOauth2ButtonClick={() => navigate("/auth/sign-up/oauth2")}
            onSignUpWithPasswordButtonClick={() => navigate("/auth/sign-up/password")}
            onNavigateToSignInLinkClick={() => navigate("/auth/sign-in")}
          />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
}
