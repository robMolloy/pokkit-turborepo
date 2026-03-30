import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pb } from "@/config/pocketbaseConfig";
import { createToastProps } from "@/lib/createToastProps";
import { ConfirmEmailChangeTokenForm, SignedInRouteProtector } from "@repo/pokkit-auth";
import { Button } from "@repo/pokkit-shadcn";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export default function Page() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  if (!token)
    return (
      <SignedInRouteProtector ifIsSignedOut={() => navigate("/")}>
        <p>A token and an email haven't been provided in the URL,</p>;
      </SignedInRouteProtector>
    );

  return (
    <SignedInRouteProtector ifIsSignedOut={() => navigate("/")}>
      <Card className="w-full max-w-md mx-auto mt-16">
        <CardHeader>
          <div className="relative flex justify-center">
            <CardTitle>Confirm email change</CardTitle>
            <Button
              variant="link"
              className="absolute left-0 top-1/2 -translate-y-1/2 p-0 h-0 text-muted-foreground"
              onClick={() => navigate("/")}
            >
              &larr; Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ConfirmEmailChangeTokenForm
            pb={pb}
            token={token}
            onConfirmEmailChangeSuccess={(messages) => toast.success(...createToastProps(messages))}
            onConfirmEmailChangeError={(messages) => toast.error(...createToastProps(messages))}
          />
        </CardContent>
      </Card>
    </SignedInRouteProtector>
  );
}
