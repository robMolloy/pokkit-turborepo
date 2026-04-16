import { envConfig } from "@/config/envConfig";
import { CustomIcon } from "@repo/pokkit-components";
import { Button, Card, CardContent } from "@repo/pokkit-shadcn";
import { Link } from "react-router-dom";

export const StripeCheckoutSessionCancelledResponseCard = () => {
  return (
    <Card className="w-full max-w-md bg-secondary text-center">
      <CardContent className="text-center">
        <div className="flex justify-center">
          <CustomIcon iconName="XCircle" size="3xl" />
        </div>

        <h1 className="text-2xl font-semibold">Payment Cancelled</h1>

        <br />
        <p>Your payment was not completed. No charges have been made to your account.</p>
        <br />

        <div className="border rounded-lg p-4 text-sm text-secondary bg-secondary-foreground">
          <p className="items-center gap-2 font-medium mb-2">
            If you experienced any issues during checkout try again or contact us at{" "}
            <a
              className="hover:underline"
              href={`mailto:${envConfig.VITE_APP_CONTACT_EMAIL_ADDRESS}`}
            >
              {envConfig.VITE_APP_CONTACT_EMAIL_ADDRESS}
            </a>
          </p>
        </div>

        <br />

        <div className="flex flex-col gap-3">
          <Button asChild>
            <Link to="/">
              Return home
              <CustomIcon iconName="ArrowRight" size="md" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
