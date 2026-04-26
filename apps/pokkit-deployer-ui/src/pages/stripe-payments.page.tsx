import { useStripeLedgerRecordsStore } from "@/modules/instanceRecords/dbStripeLedgerRecords";
import { useUserBalanceRecordsStore } from "@/modules/instanceRecords/dbUserBalanceRecords";
import { StripeLedgerRecordRowTemplate } from "@/modules/stripe/StripeLedgerRecordRowTemplate";
import { TUser, useUserStore } from "@repo/pokkit-auth";

const useStripePaymentsData = () => {
  const userStore = useUserStore();
  const userRecord = userStore.data;

  const userBalanceRecordsStore = useUserBalanceRecordsStore();
  const userBalanceRecords = userBalanceRecordsStore.data;

  const stripeLedgerRecordsStore = useStripeLedgerRecordsStore();
  const stripeLedgerRecords = stripeLedgerRecordsStore.data;

  if (
    userRecord === undefined ||
    userBalanceRecords === undefined ||
    stripeLedgerRecords === undefined
  )
    return { status: "loading" } as const;

  if (userRecord === null || userBalanceRecords === null || stripeLedgerRecords === null)
    return { status: "error" } as const;

  return {
    status: "ready",
    data: { userRecord, userBalanceRecords, stripeLedgerRecords },
  } as const;
};

const UserRecordRowTemplate = (p: { user: TUser }) => {
  return (
    <div className="flex gap-8">
      <span>
        <div className="text-sm text-muted-foreground">Name</div>
        <div>{p.user.name}</div>
      </span>
      <span>
        <div className="text-sm text-muted-foreground">Email</div>
        <div>{p.user.email}</div>
      </span>
    </div>
  );
};

export default function Page() {
  const stripePaymentsData = useStripePaymentsData();

  return (
    <div>
      <h2 className="text-xl font-semibold">Stripe Payments</h2>
      {stripePaymentsData.status === "loading" && <div>loading...</div>}
      {stripePaymentsData.status === "error" && <div>Error</div>}
      {stripePaymentsData.status === "ready" &&
        (() => {
          const relevantPayments = stripePaymentsData.data.stripeLedgerRecords.filter(
            (x) => x.eventType === "checkout.session.completed",
          );

          return (
            <div>
              <div className="flex flex-col gap-2">
                <UserRecordRowTemplate user={stripePaymentsData.data.userRecord} />
                {relevantPayments.length === 0 && (
                  <div className="text-muted-foreground">No payments yet</div>
                )}
                {relevantPayments.map((x) => (
                  <StripeLedgerRecordRowTemplate key={x.id} stripeLedgerRecord={x} />
                ))}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
