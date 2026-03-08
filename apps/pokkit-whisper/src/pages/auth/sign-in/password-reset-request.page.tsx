import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Reset password and sign in</CardTitle>
          <Button
            variant="link"
            className="p-0 h-0 text-muted-foreground"
            onClick={() => navigate("/auth/sign-in")}
          >
            Back
          </Button>
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
