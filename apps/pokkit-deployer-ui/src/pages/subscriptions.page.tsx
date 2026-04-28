import { createToastProps } from "@/lib/createToastProps";
import {
  TInstancesSubscriptionRecord,
  useInstancesSubscriptionRecordsStore,
} from "@/modules/instanceRecords/dbInstancesSubscriptionRecords";
import { retrieveStripeSubscription, TStripeSubscription } from "@/modules/stripe/stripeSdk";
import { DisplayAnything } from "@repo/pokkit-components";
import { Button } from "@repo/pokkit-shadcn";
import { RefreshCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function StripeLedgerRecordRowTemplate(p: {
  instancesSubscriptionRecord: TInstancesSubscriptionRecord;
}) {
  const subscriptionId = p.instancesSubscriptionRecord.subscriptionId;
  const [subscription, setSubscription] = useState<TStripeSubscription>();

  return (
    <div className="border bg-card rounded-md px-3 py-2">
      <div className="flex justify-between ">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
            <RefreshCcw className="size-3.5" />
          </div>
          <div>
            {p.instancesSubscriptionRecord.numberOfInstances} instance(s)
            {/* <p className="text-sm font-medium">
            {formatPositiveNegativeNumber(p.stripeLedgerRecord.quantity)}{" "}
            {p.stripeLedgerRecord.productName}(s)
          </p> */}
            {/* <p className="text-xs text-muted-foreground">
            {formatDate(p.stripeLedgerRecord.created)}
          </p> */}
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {/* <span
          className={cn(
            "font-mono text-sm font-medium",
            p.stripeLedgerRecord.quantity >= 0 ? "text-primary" : "text-destructive",
          )}
        >
          {formatCurrency(p.stripeLedgerRecord)}
        </span> */}
          {subscriptionId && (
            <Button
              onClick={async () => {
                const resp = await retrieveStripeSubscription({ subscriptionId });
                console.log(`subscriptions.page.tsx:${/*LL*/ 48}`, { resp });
                if (!resp.success) return toast.error(...createToastProps(resp.messages));
                toast.success(...createToastProps(resp.messages));
                setSubscription(resp.data);
              }}
            >
              Subscription
            </Button>
          )}
        </div>
      </div>
      {subscription && (
        <DisplayAnything data={subscription} title={""} hideFunctions={false} expandLevel={2} />
      )}
    </div>
  );
}

export default function Page() {
  const instancesSubscriptionRecordsStore = useInstancesSubscriptionRecordsStore();
  return (
    <div>
      <h2 className="text-xl font-semibold">Subscriptions</h2>

      {instancesSubscriptionRecordsStore.data === null && <div>error</div>}
      {instancesSubscriptionRecordsStore.data === undefined && <div>loading...</div>}
      {!!instancesSubscriptionRecordsStore.data &&
        (() => {
          const data = instancesSubscriptionRecordsStore.data!;

          // return data.map((x) => <pre key={x.id}>{JSON.stringify({ x }, undefined, 2)}</pre>);
          return (
            <div className="flex flex-col gap-2">
              {data.map((x) => (
                <StripeLedgerRecordRowTemplate key={x.id} instancesSubscriptionRecord={x} />
              ))}
            </div>
          );
        })()}
      <pre>{JSON.stringify(instancesSubscriptionRecordsStore, undefined, 2)}</pre>
    </div>
  );
}
