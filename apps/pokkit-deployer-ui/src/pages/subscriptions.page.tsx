import { formatCurrency } from "@/lib/currencyUtils";
import { formatDate } from "@/lib/dateUtils";
import {
  TInstancesSubscriptionRecord,
  useInstancesSubscriptionRecordsStore,
} from "@/modules/instanceRecords/dbInstancesSubscriptionRecords";
import { Button, SimpleCard, StatusIndicator } from "@repo/pokkit-components";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Separator,
} from "@repo/pokkit-shadcn";
import { RefreshCcw, Server } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const InstanceCard = (p: {
  instance: { id: string; name: string; status: string; region: string };
}) => {
  const { instance } = p;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
          <Server className="size-3.5" />
        </div>
        <div>
          <p>{instance.name}</p>
          <p className="text-xs text-muted-foreground">{instance.region}</p>
        </div>
      </div>
      <StatusIndicator color={instance.status === "red" ? "red" : "green"} />
    </div>
  );
};

export default function Page() {
  const instancesSubscriptionRecordsStore = useInstancesSubscriptionRecordsStore();

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">Subscriptions</h2>

      <br />

      {instancesSubscriptionRecordsStore.data === null && <div>error</div>}
      {instancesSubscriptionRecordsStore.data === undefined && <div>loading...</div>}
      {!!instancesSubscriptionRecordsStore.data &&
        (() => {
          const data = instancesSubscriptionRecordsStore.data!;

          return (
            <div className="flex flex-col gap-4">
              {data.map((x) => (
                <SimpleCard>
                  <StripeLedgerRecordRowTemplate key={x.id} instancesSubscriptionRecord={x} />

                  <Separator className="my-3" />

                  <Accordion type="single" collapsible>
                    <AccordionItem value="a">
                      <AccordionTrigger className="p-0">
                        View {x.numberOfInstances} instances
                      </AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-2 py-2">
                        {[...Array(x.numberOfInstances)]
                          .map((_, j) => j + 1)
                          .map((j) => (
                            <SimpleCard>
                              <InstanceCard
                                key={`id-${j}`}
                                instance={{
                                  id: `id-${j}`,
                                  name: `name-${j}`,
                                  status: `status-${j}`,
                                  region: `region-${j}`,
                                }}
                              />
                            </SimpleCard>
                          ))}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </SimpleCard>
              ))}
            </div>
          );
        })()}
    </div>
  );
}
