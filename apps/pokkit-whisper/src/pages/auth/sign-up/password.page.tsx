import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pb } from "@/config/pocketbaseConfig";
import { SignedOutRouteProtector, SignUpWithPasswordForm } from "@repo/pokkit-auth";
import { Button } from "@repo/pokkit-shadcn";
import { useNavigate } from "react-router-dom";

const SignUpWithPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <SignedOutRouteProtector ifIsSignedIn={() => navigate("/")}>
      <Card className="w-full max-w-md mx-auto mt-16">
        <CardHeader className="relative flex justify-center">
          <CardTitle>Sign up with password</CardTitle>
          <Button
            variant="link"
            className="absolute left-0 top-1/2 -translate-y-1/2 p-0 h-0 text-muted-foreground"
            onClick={() => navigate("/auth/sign-up")}
          >
            &larr; Back
          </Button>
        </CardHeader>
        <CardContent>
          <SignUpWithPasswordForm pb={pb} />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
};

export default SignUpWithPasswordPage;
