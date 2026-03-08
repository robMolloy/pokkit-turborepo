import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pb } from "@/config/pocketbaseConfig";
import {
  listAuthMethods,
  SignedOutRouteProtector,
  SignUpOrSignInOAuth2Options,
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
    <SignedOutRouteProtector ifIsSignedIn={() => navigate("/")}>
      <Card className="w-full max-w-md mx-auto mt-16">
        <CardHeader className="relative flex justify-center">
          <CardTitle>Choose your preferred OAuth2 provider</CardTitle>
        </CardHeader>
        <CardContent>
          <SignUpOrSignInOAuth2Options authMethodsList={authMethodsList} pb={pb} />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
}
