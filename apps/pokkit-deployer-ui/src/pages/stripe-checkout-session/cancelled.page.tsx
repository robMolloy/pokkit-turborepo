import { StripeCheckoutSessionCancelledResponseCard } from "@/modules/stripe/StripeCheckoutSessionCancelledResponseCard";

export default function Page() {
  return (
    <div>
      <br />
      <br />
      <br />
      <div className="flex w-full justify-center mt-8">
        <StripeCheckoutSessionCancelledResponseCard />
      </div>
    </div>
  );
}
