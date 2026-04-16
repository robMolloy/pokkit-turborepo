import { createToastProps } from "@/lib/createToastProps";
import { StripeCheckoutSessionSuccessResponseCard } from "@/modules/stripe/StripeCheckoutSessionSuccessResponseCard";
import { stripeRetrieveCheckoutSession, TCheckoutSession } from "@/modules/stripe/stripeSdk";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export default function Page() {
  const [state, setState] = useState<null | undefined | TCheckoutSession>(undefined);

  const [searchParams] = useSearchParams();
  const checkoutSessionId = searchParams.get("checkoutSessionId");

  useEffect(() => {
    const abortController = new AbortController();
    (async () => {
      if (!checkoutSessionId) return setState(null);

      const resp = await stripeRetrieveCheckoutSession({ checkoutSessionId, abortController });

      const toastFn = resp.success ? toast.success : toast.error;
      toastFn(...createToastProps(resp.messages));

      setState(resp.success ? resp.data : null);
    })();

    return () => abortController.abort();
  }, []);
  return (
    <div>
      <pre>{JSON.stringify({ checkoutSessionId }, undefined, 2)}</pre>
      <br />
      <br />
      <br />
      <div className="flex w-full justify-center mt-8">
        {state === undefined && <div>Loading...</div>}
        {state === null && <div>Error</div>}
        {!!state && <StripeCheckoutSessionSuccessResponseCard checkoutSession={state} />}
      </div>
    </div>
  );
}
