import { pb } from "@/config/pocketbaseConfig";
import z from "zod";

const checkoutSessionSchema = z.object({
  amount_total: z.number(),
  currency: z.string(),
  payment_intent: z.object({
    id: z.string(),
  }),
  payment_status: z.string(),
  status: z.string(),
});

export type TCheckoutSession = z.infer<typeof checkoutSessionSchema>;

export const stripeRetrieveCheckoutSession = async (p: {
  checkoutSessionId: string;
  abortController?: AbortController;
}) => {
  try {
    const resp = await pb.send("/stripe-retrieve-checkout-session", {
      method: "POST",
      body: JSON.stringify({ checkoutSessionId: p.checkoutSessionId }),
      signal: p.abortController?.signal,
    });

    const respSchema = z.object({ checkoutSession: checkoutSessionSchema });
    const data = respSchema.parse(resp);
    const messages = ["Successfully retrieved stripe checkout session"];

    return { success: true, data: data.checkoutSession, messages } as const;
  } catch (error) {
    const isAbort = (error as { isAbort?: boolean }).isAbort;
    if (isAbort)
      return {
        success: false,
        messages: ["Retrieved stripe checkout session request cancelled"] as string[],
      } as const;

    const messages = ["Failed to retrieve stripe checkout session"];

    return { success: false, error, messages } as const;
  }
};
