import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pb } from "@/config/pocketbaseConfig";
import { createToastProps } from "@/lib/createToastProps";
import { SignedOutRouteProtector, SignInWithPasswordForm } from "@repo/pokkit-auth";
import { Button } from "@repo/pokkit-shadcn";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const SignInWithPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <SignedOutRouteProtector ifIsSignedIn={() => navigate("/")}>
      <Card className="w-full max-w-md mx-auto mt-16">
        <CardHeader>
          <div className="relative flex justify-center">
            <CardTitle>Sign in with password</CardTitle>
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
          <SignInWithPasswordForm
            pb={pb}
            onForgotPasswordLinkClick={() => navigate("/auth/sign-in/password-reset-request")}
            onSignInSuccess={(messages) => toast.success(...createToastProps(messages))}
            onSignInError={(messages) => toast.error(...createToastProps(messages))}
          />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
};

export default SignInWithPasswordPage;
