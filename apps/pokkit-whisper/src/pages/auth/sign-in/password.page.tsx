import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pb } from "@/config/pocketbaseConfig";
import { SignedOutRouteProtector, SignInWithPasswordForm } from "@repo/pokkit-auth";
import { useNavigate } from "react-router-dom";
const SignInWithPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <SignedOutRouteProtector>
      <Card className="w-full max-w-md mx-auto mt-16">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter your credentials to sign in</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInWithPasswordForm
            pb={pb}
            onForgotPasswordLinkClick={() => navigate("/auth/sign-in/forgot-password")}
          />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
};

export default SignInWithPasswordPage;
