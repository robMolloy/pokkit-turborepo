import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pb } from "@/config/pocketbaseConfig";
import {
  SignedOutRouteProtector,
  SignUpOrSignInOAuth2Options,
  useAuthMethodsListStore,
} from "@repo/pokkit-auth";
import { Button } from "@repo/pokkit-shadcn";
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
        <CardHeader>
          <div className="relative flex justify-center">
            <CardTitle>Choose your preferred OAuth2 provider</CardTitle>
            <Button
              variant="link"
              className="absolute left-0 top-1/2 -translate-y-1/2 p-0 h-0 text-muted-foreground"
              onClick={() => navigate("/auth/sign-in")}
            >
              &larr; Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <SignUpOrSignInOAuth2Options authMethodsList={authMethodsList} pb={pb} />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
}
