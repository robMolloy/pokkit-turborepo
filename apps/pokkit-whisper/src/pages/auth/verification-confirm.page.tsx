import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pb } from "@/config/pocketbaseConfig";
import {
  confirmVerificationEmail,
  SignedInRouteProtector,
  SignedOutRouteProtector,
} from "@repo/pokkit-auth";
import { Button } from "@repo/pokkit-shadcn";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Page() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [verificationRequestStatus, setVerificationRequestStatus] = useState<boolean>();

  useEffect(() => {
    (async () => {
      if (!token) return;
      const resp = await confirmVerificationEmail({ pb, token });
      setVerificationRequestStatus(resp.success);
    })();
  }, []);

  // The following JSX is relatively unclear. As verification confirmation can be performed on signed in or signed out.
  // It may be clearer if this is split into two separate components
  return (
    <Card className="w-full max-w-md mx-auto mt-16">
      <CardHeader>
        <div className="relative flex justify-center">
          <CardTitle>
            <SignedInRouteProtector
              childrenWithAuthStore={(authStore) => {
                if (authStore.record.verified) return "Your email is verified";
                if (!token) return "A token hasn't been provided in the URL,";
                if (verificationRequestStatus === undefined) return "Confirming verification...";
                return verificationRequestStatus ? "Your email is verified" : "Verification failed";
              }}
            />
            <SignedOutRouteProtector>
              {(() => {
                if (!token) return "A token hasn't been provided in the URL,";
                if (verificationRequestStatus === undefined) return "Confirming verification...";

                return verificationRequestStatus ? "Your email is verified" : "Verification failed";
              })()}
            </SignedOutRouteProtector>
          </CardTitle>
          <Button
            variant="link"
            className="absolute left-0 top-1/2 -translate-y-1/2 p-0 h-0 text-muted-foreground"
            onClick={() => navigate("/auth/sign-in")}
          >
            &larr; Back
          </Button>
        </div>
      </CardHeader>

      <SignedInRouteProtector
        childrenWithAuthStore={(authStore) =>
          authStore.record.verified ? (
            <CardContent>
              <Button onClick={() => navigate("/")}>Go home</Button>
            </CardContent>
          ) : (
            <></>
          )
        }
      />
      <SignedOutRouteProtector>
        <CardContent>
          <Button onClick={() => navigate("/auth/sign-in")}>Go to sign in</Button>
        </CardContent>
      </SignedOutRouteProtector>
    </Card>
  );
}
