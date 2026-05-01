import { pb } from "@/config/pocketbaseConfig";
import { createToastProps } from "@/lib/createToastProps";
import {
  createStripeCheckoutSession,
  updateStripeSubscriptionQuantity,
} from "@/modules/stripe/stripeSdk";
import { Button } from "@repo/pokkit-components";
import { useState } from "react";
import { toast } from "sonner";

export default function Page() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <span>
      <span className="inline-flex flex-col gap-8">
        <Button
          loading={isLoading}
          onClick={async () => {
            setIsLoading(true);
            const resp = (await pb.send("/hello/rob", { method: "GET" })) as Response;
            console.log(`topup-user-balance.page.tsx:${/*LL*/ 39}`, resp);
            setIsLoading(false);
          }}
        >
          hit hello endpoint
        </Button>
        <Button
          loading={isLoading}
          onClick={async () => {
            setIsLoading(true);
            const resp = await pb.send("/bye", {
              method: "POST",
              body: JSON.stringify({ name: "robby" }),
            });
            console.log(`topup-user-balance.page.tsx:${/*LL*/ 51}`, resp);
            setIsLoading(false);
          }}
        >
          hit bye endpoint
        </Button>
        <Button
          loading={isLoading}
          onClick={async () => {
            setIsLoading(true);
            const sessionResp = await createStripeCheckoutSession({
              productName: "token",
              quantity: 100,
            });

            if (!sessionResp.success) return toast.error(...createToastProps(sessionResp.messages));

            window.location.href = sessionResp.data.url;
            setIsLoading(false);
          }}
        >
          Top up 100
        </Button>
        <Button
          loading={isLoading}
          onClick={async () => {
            setIsLoading(true);
            const sessionResp = await createStripeCheckoutSession({
              productName: "instance_subscription",
              quantity: 100,
            });
            setIsLoading(false);

            if (!sessionResp.success) return toast.error(...createToastProps(sessionResp.messages));
            window.location.href = sessionResp.data.url;
          }}
        >
          create a subscription
        </Button>
        <Button
          loading={isLoading}
          onClick={async () => {
            setIsLoading(true);
            const sessionResp = await updateStripeSubscriptionQuantity({
              quantity: Math.floor(Math.random() * 100),
              subscriptionId: "sub_1TSEhBIGFJRyk0RhOHwSuOOa",
            });
            setIsLoading(false);

            if (!sessionResp.success) return toast.error(...createToastProps(sessionResp.messages));
            return toast.success(...createToastProps(sessionResp.messages));
          }}
        >
          edit a subscription
        </Button>
      </span>
    </span>
  );
}
