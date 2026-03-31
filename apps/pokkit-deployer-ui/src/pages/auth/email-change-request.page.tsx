import { Card, CardContent, CardHeader, CardTitle } from "@repo/pokkit-shadcn";
import { pb } from "@/config/pocketbaseConfig";
import { createToastProps } from "@/lib/createToastProps";
import { RequestEmailChangeTokenForm, SignedInRouteProtector } from "@repo/pokkit-auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default () => {
  const navigate = useNavigate();
  return (
    <SignedInRouteProtector ifIsSignedOut={() => navigate("/auth/sign-in")}>
      <Card className="w-full max-w-md mx-auto mt-16">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Request email change</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestEmailChangeTokenForm
            pb={pb}
            onRequestEmailChangeSuccess={(messages) => toast.success(...createToastProps(messages))}
            onRequestEmailChangeError={(messages) => toast.error(...createToastProps(messages))}
          />
        </CardContent>
      </Card>
    </SignedInRouteProtector>
  );
};
