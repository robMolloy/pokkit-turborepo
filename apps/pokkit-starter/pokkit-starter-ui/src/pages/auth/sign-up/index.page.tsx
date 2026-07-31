import { Card, CardContent, CardHeader, CardTitle } from "@repo/pokkit-shadcn";
import {
  SignedOutRouteProtector,
  SignUpNavigationOptions,
  useAuthMethodsListStore,
} from "@repo/pokkit-auth";
import { useNavigate } from "react-router-dom";

export default function Page() {
  const navigate = useNavigate();

  const authMethodsListStore = useAuthMethodsListStore();
  const authMethodsList = authMethodsListStore.data;

  if (authMethodsList === null) return <div>Failed to load auth methods</div>;
  if (authMethodsList === undefined) return <div>Loading...</div>;
  return (
    <SignedOutRouteProtector ifIsSignedIn={() => navigate("/")}>
      <Card className="w-full max-w-md mx-auto mt-16">
        <CardHeader className="flex justify-center">
          <CardTitle>Choose your preferred sign-up method</CardTitle>
        </CardHeader>
        <CardContent>
          <SignUpNavigationOptions
            authMethodsList={authMethodsList}
            onSignUpWithOtpButtonClick={() => navigate("/auth/sign-up/one-time-passcode")}
            onSignUpWithOauth2ButtonClick={() => navigate("/auth/sign-up/oauth2")}
            onSignUpWithPasswordButtonClick={() => navigate("/auth/sign-up/password")}
            onNavigateToSignInLinkClick={() => navigate("/auth/sign-in")}
          />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
}
