import { pb } from "@/config/pocketbaseConfig";
import { errorSchema } from "@/lib/errorUtils";
import { extractMessageFromPbError } from "@repo/pokkit-auth";
import z from "zod";

const checkoutSessionSchema = z.object({
  amount_total: z.number(),
  currency: z.string(),
  payment_intent: z.object({ id: z.string() }).nullish(),
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
        scenario: "REQUEST_ABORTED",
      } as const;

    const messages = ["Failed to retrieve stripe checkout session"];

    return { success: false, error, messages } as const;
  }
};

const invoiceSchema = z.object({
  hosted_invoice_url: z.string(),
});

export type TInvoiceSchema = z.infer<typeof invoiceSchema>;
export const stripeRetrieveInvoice = async (p: {
  invoiceId: string;
  abortController?: AbortController;
}) => {
  try {
    const resp = await pb.send("/stripe-retrieve-invoice", {
      method: "POST",
      body: JSON.stringify({ invoiceId: p.invoiceId }),
      signal: p.abortController?.signal,
    });

    const respSchema = z.object({ invoice: invoiceSchema });
    const data = respSchema.parse(resp);
    const messages = ["Successfully retrieved stripe invoice"];

    return { success: true, data: data.invoice, messages } as const;
  } catch (error) {
    const isAbort = (error as { isAbort?: boolean }).isAbort;
    if (isAbort)
      return {
        success: false,
        messages: ["Retrieved stripe invoice request cancelled"] as string[],
      } as const;

    const messages = ["Failed to retrieve stripe invoice"];

    return { success: false, error, messages } as const;
  }
};

const stripeSubscriptionSchema = z
  .object({
    id: z.string(),
  })
  .loose();

export type TStripeSubscription = z.infer<typeof stripeSubscriptionSchema>;
export const retrieveStripeSubscription = async (p: {
  subscriptionId: string;
  abortController?: AbortController;
}) => {
  try {
    const resp = await pb.send("/stripe-retrieve-subscription", {
      method: "POST",
      body: JSON.stringify({ subscriptionId: p.subscriptionId }),
      signal: p.abortController?.signal,
    });

    const respSchema = z.object({ subscription: stripeSubscriptionSchema });
    const data = respSchema.parse(resp);
    const messages = ["Successfully retrieved stripe subscription"];
    return { success: true, data: data.subscription, messages } as const;
  } catch (error) {
    const isAbort = (error as { isAbort?: boolean }).isAbort;
    if (isAbort)
      return {
        success: false,
        messages: ["Retrieved stripe subscription request cancelled"] as string[],
      } as const;

    const messagesResp = extractMessageFromPbError({ error }) ?? [];
    const messages = ["Failed to retrieve stripe subscription", ...messagesResp];

    return { success: false, error, messages } as const;
  }
};

export const createStripeCheckoutSession = async (p1: {
  productName: string;
  quantity: number;
}) => {
  try {
    const res = await pb.send("/stripe-create-checkout-session", {
      method: "POST",
      body: JSON.stringify(p1),
    });
    const schema = z.object({ url: z.string() });
    const data = schema.parse(res);

    const messages = ["Successfully set up the stripe checkout session"];
    return { success: true, data, messages } as const;
  } catch (error) {
    const messages = ["Failed to set up the stripe checkout session"];
    const errorResp = errorSchema.loose().safeParse(error);
    if (errorResp.success) messages.push(errorResp.data.message);

    return { success: false, messages, error } as const;
  }
};
export const updateStripeSubscriptionQuantity = async (p: {
  subscriptionId: string;
  quantity: number;
}) => {
  try {
    const res = await pb.send("/update-stripe-subscription", {
      method: "POST",
      body: JSON.stringify(p),
    });
    const schema = z.object({ quantity: z.number() });
    const data = schema.parse(res);

    const messages = [
      `Successfully updated the stripe subscription quantity to ${data.quantity}`,
      "It may take a short period of time for the changes to show",
    ];
    return { success: true, data, messages } as const;
  } catch (error) {
    const messages = ["Failed to update the stripe subscription"];
    const errorResp = errorSchema.loose().safeParse(error);
    if (errorResp.success) messages.push(errorResp.data.message);

    return { success: false, messages, error } as const;
  }
};
