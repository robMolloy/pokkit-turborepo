import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pb } from "@/config/pocketbaseConfig";
import { SignedOutRouteProtector, SignInWithOtpForm } from "@repo/pokkit-auth";
import { Button } from "@repo/pokkit-shadcn";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const createToastProps = (messages: string[]) => {
  const [firstMessage, ...otherMessages] = messages;
  return [
    firstMessage,
    { description: otherMessages?.map((msg, index) => <p key={index}>{msg}</p>) },
  ] as const;
};

const SignInWithOtpPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <SignedOutRouteProtector ifIsSignedIn={() => navigate("/")}>
      <Card className="w-full max-w-md mx-auto mt-16">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Sign in with OTP</CardTitle>
          <Button
            variant="link"
            className="p-0 h-0 text-muted-foreground"
            onClick={() => navigate("/auth/sign-in")}
          >
            Back
          </Button>
        </CardHeader>
        <CardContent>
          <SignInWithOtpForm
            pb={pb}
            onSignInSuccess={() => toast.success("Signed in successfully!")}
            onSignInError={(messages) => {
              toast.error(...createToastProps(messages));
            }}
          />
        </CardContent>
      </Card>
    </SignedOutRouteProtector>
  );
};

export default SignInWithOtpPage;
