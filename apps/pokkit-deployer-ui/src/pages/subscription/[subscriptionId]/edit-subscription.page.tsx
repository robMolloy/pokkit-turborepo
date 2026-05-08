import { createToastProps } from "@/lib/createToastProps";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDate } from "@/lib/dateUtils";
import {
  TInstancesSubscriptionRecord,
  useInstancesSubscriptionRecordsStore,
} from "@/modules/instanceRecords/dbInstancesSubscriptionRecords";
import { updateStripeSubscriptionQuantity } from "@/modules/stripe/stripeSdk";
import { Button, InputLabel, NumberInput } from "@repo/pokkit-components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/pokkit-shadcn";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const EditSubscriptionForm = (p: { subscription: TInstancesSubscriptionRecord }) => {
  const subscription = p.subscription;
  const [quantity, setQuantity] = useState(subscription.numberOfInstances);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const newAmount = quantity * subscription.costPerUnit;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Subscription</CardTitle>
        <CardDescription>Adjust the quantity of instances for your subscription</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 rounded-lg bg-muted p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subscription ID</span>
            <span>{subscription.subscriptionId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current quantity</span>
            <span>{subscription.numberOfInstances}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost per unit</span>
            <span>{formatCurrency({ currency: "usd", amount: subscription.costPerUnit })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current cost</span>
            <span>{formatCurrency({ currency: "usd", amount: subscription.amount })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Billing cycle</span>
            <span className="capitalize">
              {subscription.intervalCount === 1
                ? `Every ${subscription.interval}`
                : `Every ${subscription.intervalCount} ${subscription.interval}s`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid until</span>
            <span>{formatDate(subscription.paidUntilDateTime)}</span>
          </div>
        </div>

        <br />
        <form>
          <div>
            <InputLabel htmlFor="quantity">Number of Instances</InputLabel>
            <NumberInput
              id="quantity"
              min={1}
              value={quantity}
              onValueChange={(e) => setQuantity(e)}
            />
          </div>
          <br />
          <div className="flex justify-between items-center">
            <span className="font-medium">New monthly total</span>
            <span className="text-lg font-semibold">
              {formatCurrency({ currency: "usd", amount: newAmount })}
            </span>
          </div>
          <br />
          <div className="flex justify-stretch gap-4">
            <Button
              variant="outline"
              className="flex-1"
              type="button"
              onClick={() => setQuantity(subscription.numberOfInstances)}
            >
              Reset
            </Button>
            <Button
              disabled={quantity === p.subscription.numberOfInstances}
              className="flex-1"
              loading={isLoading}
              onClick={async () => {
                setIsLoading(true);
                const sessionResp = await updateStripeSubscriptionQuantity({
                  quantity,
                  subscriptionId: subscription.subscriptionId,
                });
                setIsLoading(false);

                const toastFn = sessionResp.success ? toast.success : toast.error;
                toastFn(...createToastProps(sessionResp.messages));

                if (sessionResp.success) navigate("/subscriptions");
              }}
            >
              Update Subscription
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default function Page() {
  const params = useParams();
  const instancesSubscriptionRecordsStore = useInstancesSubscriptionRecordsStore();

  const subscriptionId = params["subscriptionId"];
  if (!subscriptionId) return <div>No subscription passed</div>;

  const subscription = instancesSubscriptionRecordsStore.data?.find(
    (x) => x.subscriptionId === subscriptionId,
  );
  if (!subscription) return <div>No subscription found</div>;

  return (
    <div>
      <EditSubscriptionForm subscription={subscription} />
    </div>
  );
}
