import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SignedOutRouteProtector,
  SignInNavigationOptions,
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
          <CardTitle>Choose your sign-in method</CardTitle>
        </CardHeader>
        <CardContent>
          <SignInNavigationOptions
            authMethodsList={authMethodsList}
            onSignInWithOtpButtonClick={() => navigate("/auth/sign-in/one-time-passcode")}
            onSignInWithOauth2ButtonClick={() => navigate("/auth/sign-in/oauth2")}
            onSignInWithPasswordButtonClick={() => navigate("/auth/sign-in/password")}
            onNavigateToSignUpLinkClick={() => navigate("/auth/sign-up")}
          />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
}
