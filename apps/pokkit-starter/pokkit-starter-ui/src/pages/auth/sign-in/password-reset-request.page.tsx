import { Card, CardContent, CardHeader, CardTitle } from "@repo/pokkit-shadcn";
import { pb } from "@/config/pocketbaseConfig";
import { createToastProps } from "@/lib/createToastProps";
import { RequestPasswordResetTokenForm, SignedOutRouteProtector } from "@repo/pokkit-auth";
import { Button } from "@repo/pokkit-shadcn";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  return (
    <SignedOutRouteProtector ifIsSignedIn={() => navigate("/")}>
      <Card className="w-full max-w-md mx-auto mt-16">
        <CardHeader>
          <div className="relative flex justify-center">
            <CardTitle>Reset password and sign in</CardTitle>
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
          <RequestPasswordResetTokenForm
            pb={pb}
            onRequestPasswordResetSuccess={(messages) =>
              toast.success(...createToastProps(messages))
            }
            onRequestPasswordResetError={(messages) => toast.error(...createToastProps(messages))}
          />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
}
