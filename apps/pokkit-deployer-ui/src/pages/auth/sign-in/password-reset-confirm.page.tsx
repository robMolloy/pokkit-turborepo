import { Card, CardContent, CardHeader, CardTitle } from "@repo/pokkit-shadcn";
import { pb } from "@/config/pocketbaseConfig";
import { createToastProps } from "@/lib/createToastProps";
import { SignedOutRouteProtector, SignInWithPasswordResetTokenForm } from "@repo/pokkit-auth";
import { Button } from "@repo/pokkit-shadcn";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export default function Page() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email)
    return (
      <SignedOutRouteProtector ifIsSignedIn={() => navigate("/")}>
        {(() => {
          if (!token && !email)
            return <p>A token and an email haven't been provided in the URL,</p>;
          if (!token) return <p>A token hasn't been provided in the URL,</p>;
          return <p>An email hasn't been provided in the URL,</p>;
        })()}
      </SignedOutRouteProtector>
    );

  return (
    <SignedOutRouteProtector ifIsSignedIn={() => navigate("/")}>
      <Card className="w-full max-w-md mx-auto mt-16">
        <CardHeader>
          <div className="relative flex justify-center">
            <CardTitle>Confirm new password and sign in</CardTitle>
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
          <SignInWithPasswordResetTokenForm
            pb={pb}
            initEmailValue={email}
            initPasswordResetTokenValue={token}
            onSignInSuccess={(messages) => toast.success(...createToastProps(messages))}
            onSignInError={(messages) => toast.error(...createToastProps(messages))}
            onConfirmPasswordResetSuccess={(messages) =>
              toast.success(...createToastProps(messages))
            }
            onConfirmPasswordResetError={(messages) => toast.error(...createToastProps(messages))}
          />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
}
