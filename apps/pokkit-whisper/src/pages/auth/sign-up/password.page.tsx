import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pb } from "@/config/pocketbaseConfig";
import { createToastProps } from "@/lib/createToastProps";
import { SignedOutRouteProtector, SignUpWithPasswordForm } from "@repo/pokkit-auth";
import { Button } from "@repo/pokkit-shadcn";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const SignUpWithPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <SignedOutRouteProtector ifIsSignedIn={() => navigate("/")}>
      <Card className="w-full max-w-md mx-auto mt-16">
        <CardHeader>
          <div className="relative flex justify-center">
            <CardTitle>Sign up with password</CardTitle>
            <Button
              variant="link"
              className="absolute left-0 top-1/2 -translate-y-1/2 p-0 h-0 text-muted-foreground"
              onClick={() => navigate("/auth/sign-up")}
            >
              &larr; Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <SignUpWithPasswordForm
            pb={pb}
            onSignUpSuccess={(messages) => toast.success(...createToastProps(messages))}
            onSignUpError={(messages) => toast.error(...createToastProps(messages))}
          />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
};

export default SignUpWithPasswordPage;
