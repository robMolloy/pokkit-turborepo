import { pb } from "@/config/pocketbaseConfig";
import { createToastProps } from "@/lib/createToastProps";
import { createStripeCheckoutSession } from "@/modules/stripe/stripeSdk";
import { Button } from "@repo/pokkit-shadcn";
import { toast } from "sonner";

export default function Page() {
  return (
    <div>
      <Button
        type="button"
        onClick={async () => {
          const resp = (await pb.send("/hello/rob", { method: "GET" })) as Response;
          console.log(`topup-user-balance.page.tsx:${/*LL*/ 39}`, resp);
        }}
      >
        hit hello endpoint
      </Button>
      <Button
        type="button"
        onClick={async () => {
          const resp = await pb.send("/bye", {
            method: "POST",
            body: JSON.stringify({ name: "robby" }),
          });
          console.log(`topup-user-balance.page.tsx:${/*LL*/ 51}`, resp);
        }}
      >
        hit bye endpoint
      </Button>
      <Button
        onClick={async () => {
          const sessionResp = await createStripeCheckoutSession({
            product: "token",
            quantity: 100,
          });

          if (!sessionResp.success) return toast.error(...createToastProps(sessionResp.messages));

          window.location.href = sessionResp.data.url;
        }}
      >
        Top up 100
      </Button>
      <Button
        onClick={async () => {
          const sessionResp = await createStripeCheckoutSession({
            product: "instance_subscription",
            quantity: 100,
          });

          if (!sessionResp.success) return toast.error(...createToastProps(sessionResp.messages));

          window.location.href = sessionResp.data.url;
        }}
      >
        create a subscription
      </Button>
    </div>
  );
}

// const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

// const TOKEN_AMOUNT = 100;

// export function BuyTokensButton() {
//   const handleBuy = async () => {
//     const stripe = await stripePromise;
//     if (!stripe) return console.error("Stripe failed to load.");

//     const res = await fetch("/api/create-payment-intent", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ tokens: TOKEN_AMOUNT }),
//     });

//     const data = await res.json();
//     console.log("PaymentIntent response:", data);

//     const { error } = await stripe.confirmPayment({
//       clientSecret: data.clientSecret,
//       confirmParams: {
//         return_url: `${window.location.origin}/payment-success`,
//       },
//     });

//     console.log("Stripe result:", error ?? "redirecting…");
//   };

//   return (
//     <button onClick={handleBuy}>
//       <span>◈</span>
//       Buy {TOKEN_AMOUNT} Tokens
//     </button>
//   );
// }
