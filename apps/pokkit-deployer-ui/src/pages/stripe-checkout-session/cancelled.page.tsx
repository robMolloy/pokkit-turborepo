import { StripeCheckoutSessionCancelledResponseCard } from "@/modules/stripe/StripeCheckoutSessionCancelledResponseCard";

export default function Page() {
  return (
    <div>
      <br />
      <br />
      <div className="flex w-full justify-center">
        <StripeCheckoutSessionCancelledResponseCard />
      </div>
    </div>
  );
}
