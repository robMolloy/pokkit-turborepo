import { CustomIcon } from "@repo/pokkit-components";
import { Button, Card, CardContent } from "@repo/pokkit-shadcn";
import { Link } from "react-router-dom";
import { TCheckoutSession } from "./stripeSdk";

const checkoutSessionPaymentStatusLookup: { [k: string]: string } = {
  paid: "paid",
};

export const StripeCheckoutSessionSuccessResponseCard = (p: {
  checkoutSession: TCheckoutSession;
}) => {
  const status = checkoutSessionPaymentStatusLookup[p.checkoutSession.payment_status];
  return (
    <Card className="w-full max-w-md bg-secondary text-center">
      <CardContent className="text-center">
        <div className="flex justify-center">
          <CustomIcon iconName="CheckCircleIcon" size="3xl" />
        </div>

        <h1 className="text-2xl font-semibold">
          {status === "paid" ? "Payment Successful" : "Payment Pending"}
        </h1>

        <br />
        <p>
          {status === "paid"
            ? "Thank you for your purchase. Your order has been confirmed."
            : "Your order is pending. Sometimes it can take a short while for your order to be processed."}
        </p>
        <br />

        <div className="border rounded-lg p-4 text-sm text-secondary bg-secondary-foreground">
          <p className="flex justify-center items-center gap-2 font-medium mb-2">
            <CustomIcon iconName="Clock" size="md" />
            Processing your order
          </p>
          <p>
            It may take a few moments for your purchase to appear in your account. Please allow up
            to 5 minutes for everything to update.
          </p>
        </div>

        <br />
        <p className="text-muted-foreground text-sm">
          Stripe will handle your payment and notify you based on your preferences
        </p>
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
