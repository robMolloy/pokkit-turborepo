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
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Sign up with password</CardTitle>
          <Button
            variant="link"
            className="p-0 h-0 text-muted-foreground"
            onClick={() => navigate("/auth/sign-up")}
          >
            Back
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
