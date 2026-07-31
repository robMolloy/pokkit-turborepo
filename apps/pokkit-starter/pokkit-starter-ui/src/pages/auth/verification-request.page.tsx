import { Card, CardContent, CardHeader, CardTitle } from "@repo/pokkit-shadcn";
import { pb } from "@/config/pocketbaseConfig";
import { createToastProps } from "@/lib/createToastProps";
import { RequestVerificationTokenForm, SignedInRouteProtector } from "@repo/pokkit-auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default () => {
  const navigate = useNavigate();

  return (
    <SignedInRouteProtector
      ifUserIsVerified={() => navigate("/")}
      childrenWithAuthStore={(authStore) => (
        <Card className="w-full max-w-md mx-auto mt-16">
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Request verification</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestVerificationTokenForm
              pb={pb}
              email={authStore.record.email}
              onRequestVerificationSuccess={(messages) =>
                toast.success(...createToastProps(messages))
              }
              onRequestVerificationError={(messages) => toast.error(...createToastProps(messages))}
            />
          </CardContent>
        </Card>
      )}
    />
  );
};
