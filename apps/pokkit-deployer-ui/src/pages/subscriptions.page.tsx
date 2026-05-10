import { pb } from "@/config/pocketbaseConfig";
import { createToastProps } from "@/lib/createToastProps";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDate } from "@/lib/dateUtils";
import {
  createInstanceRequestRecord,
  TInstanceRequestRecord,
  useInstanceRequestRecordsStore,
} from "@/modules/instanceRecords/dbInstanceRequestRecords";
import {
  TInstancesSubscriptionRecord,
  useInstancesSubscriptionRecordsStore,
} from "@/modules/instanceRecords/dbInstancesSubscriptionRecords";
import { Button, LoadingOnClickButton, SimpleCard, StatusIndicator } from "@repo/pokkit-components";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Separator,
} from "@repo/pokkit-shadcn";
import { RefreshCcw, Server } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function StripeLedgerRecordRowTemplate(p: {
  instancesSubscriptionRecord: TInstancesSubscriptionRecord;
}) {
  const subscriptionId = p.instancesSubscriptionRecord.subscriptionId;
  const navigate = useNavigate();

  return (
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
              amount: p.instancesSubscriptionRecord.cost,
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {`every ${p.instancesSubscriptionRecord.intervalCount} ${p.instancesSubscriptionRecord.interval}`}
          </p>
        </div>
        <span className="font-mono text-sm font-medium"></span>
        {subscriptionId && (
          <Button
            onClick={async () => {
              navigate(
                `/subscription/${p.instancesSubscriptionRecord.subscriptionId}/edit-subscription`,
              );
            }}
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

const InstanceCard = (p: { instanceRequestRecord: TInstanceRequestRecord }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
          <Server className="size-3.5" />
        </div>
        <div>
          <p>{p.instanceRequestRecord.instanceNumber}</p>
          <p className="text-xs text-muted-foreground">
            {p.instanceRequestRecord.instancesSubscriptionId}
          </p>
        </div>
      </div>
      <StatusIndicator color={"green"} />
      {/* <StatusIndicator color={instance.status === "red" ? "red" : "green"} /> */}
    </div>
  );
};

export default function Page() {
  const instancesSubscriptionRecordsStore = useInstancesSubscriptionRecordsStore();
  const instanceRequestRecordsStore = useInstanceRequestRecordsStore();

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">Subscriptions</h2>

      <br />

      {instancesSubscriptionRecordsStore.data === null && <div>error</div>}
      {instancesSubscriptionRecordsStore.data === undefined && <div>loading...</div>}
      {!!instancesSubscriptionRecordsStore.data &&
        instanceRequestRecordsStore.data &&
        (() => {
          const instancesSubscriptionRecords = instancesSubscriptionRecordsStore.data!;
          const instanceRequestRecords = instanceRequestRecordsStore.data!;
          const instanceRequestRecordsInstancesSubscriptionIdLookup: {
            [k: string]: TInstanceRequestRecord[];
          } = {};
          instancesSubscriptionRecords.forEach((x) => {
            instanceRequestRecordsInstancesSubscriptionIdLookup[x.id] = [];
          });
          instanceRequestRecords.forEach((x) => {
            const records =
              instanceRequestRecordsInstancesSubscriptionIdLookup[x.instancesSubscriptionId];
            if (records) records.push(x);
          });

          return (
            <div className="flex flex-col gap-4">
              {instancesSubscriptionRecords.map((x) => {
                const thisSubscriptionsInstanceRequestRecords =
                  instanceRequestRecordsInstancesSubscriptionIdLookup[x.id];
                return (
                  <SimpleCard key={x.id}>
                    <StripeLedgerRecordRowTemplate instancesSubscriptionRecord={x} />

                    <Separator className="my-3" />

                    <Accordion type="single" collapsible>
                      <AccordionItem value="a">
                        <AccordionTrigger className="p-0">
                          {`View ${thisSubscriptionsInstanceRequestRecords?.length} of ${x.numberOfInstances} instances`}
                        </AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-2 py-2">
                          <LoadingOnClickButton
                            onClick={async () => {
                              const resp = await createInstanceRequestRecord({
                                pb: pb,
                                data: {
                                  instancesSubscriptionId: x.id,
                                  instanceNumber:
                                    (thisSubscriptionsInstanceRequestRecords?.length ?? 0) + 1,
                                },
                              });

                              const toastFn = resp.success ? toast.success : toast.error;
                              toastFn(...createToastProps(resp.messages));
                            }}
                          >
                            Add new instance
                          </LoadingOnClickButton>
                          {!!thisSubscriptionsInstanceRequestRecords &&
                            thisSubscriptionsInstanceRequestRecords.map((x) => (
                              <SimpleCard key={x.id}>
                                <InstanceCard key={x.id} instanceRequestRecord={x} />
                              </SimpleCard>
                            ))}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </SimpleCard>
                );
              })}
            </div>
          );
        })()}
    </div>
  );
}
