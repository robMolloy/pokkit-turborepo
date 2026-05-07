import { createToastProps } from "@/lib/createToastProps";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDate } from "@/lib/dateUtils";
import {
  TInstancesSubscriptionRecord,
  useInstancesSubscriptionRecordsStore,
} from "@/modules/instanceRecords/dbInstancesSubscriptionRecords";
import { updateStripeSubscriptionQuantity } from "@/modules/stripe/stripeSdk";
import { Button } from "@repo/pokkit-components";
import { RefreshCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function StripeLedgerRecordRowTemplate(p: {
  instancesSubscriptionRecord: TInstancesSubscriptionRecord;
}) {
  const subscriptionId = p.instancesSubscriptionRecord.subscriptionId;
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="border bg-card rounded-md px-3 py-2">
      <div className="flex justify-between ">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
            <RefreshCcw className="size-3.5" />
          </div>
          <div>
            <p>{p.instancesSubscriptionRecord.numberOfInstances} instance(s)</p>
            <p className="text-xs text-muted-foreground">
              paid until {formatDate(p.instancesSubscriptionRecord.paidUntilDateTime)}
            </p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div>
            <p>
              {formatCurrency({
                currency: p.instancesSubscriptionRecord.currency,
                amountTotal: p.instancesSubscriptionRecord.amount,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              every {p.instancesSubscriptionRecord.intervalCount}{" "}
              {p.instancesSubscriptionRecord.interval}
            </p>
          </div>
          <span className="font-mono text-sm font-medium"></span>
          {subscriptionId && (
            <Button
              loading={isLoading}
              onClick={async () => {
                setIsLoading(true);
                const sessionResp = await updateStripeSubscriptionQuantity({
                  quantity: Math.floor(Math.random() * 100),
                  subscriptionId: p.instancesSubscriptionRecord.subscriptionId,
                });
                setIsLoading(false);

                const toastFn = sessionResp.success ? toast.success : toast.error;
                toastFn(...createToastProps(sessionResp.messages));
              }}
            >
              Subscription
            </Button>
          )}
        </div>
      </div>
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
