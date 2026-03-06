import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pb } from "@/config/pocketbaseConfig";
import {
  listAuthMethods,
  SignedOutRouteProtector,
  SignInNavigationOptions,
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
          <CardTitle>Sign in to your account</CardTitle>
          <CardDescription>Choose your preferred sign-in method</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInNavigationOptions
            authMethodsList={authMethodsList}
            onSignInWithOtpButtonClick={() => navigate("/auth/sign-in/otp")}
            onSignInWithOauth2ButtonClick={() => navigate("/auth/sign-in/oauth2")}
            onSignInWithPasswordButtonClick={() => navigate("/auth/sign-in/password")}
            onNavigateToSignUpLinkClick={() => navigate("/auth/sign-up")}
          />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
}
