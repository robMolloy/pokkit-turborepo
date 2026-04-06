import { pb } from "@/config/pocketbaseConfig";
import { createToastProps } from "@/lib/createToastProps";
import { cn } from "@/lib/utils";
import {
  createAdminAdjustmentUserBalanceLedgerRecord,
  TUserBalanceLedgerRecord,
  useUserBalanceLedgerRecordsStore,
} from "@/modules/instanceRecords/dbUserBalanceLedgerRecords";
import {
  TUserBalanceRecord,
  useUserBalanceRecordsStore,
} from "@/modules/instanceRecords/dbUserBalanceRecords";
import { TUser, useUserRecordsStore, useUserStore } from "@repo/pokkit-auth";
import { ModalContent, NumberInput, useModalStore } from "@repo/pokkit-components";
import {
  Button,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/pokkit-shadcn";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Settings2,
  Users,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

type TUserBalanceDetails = {
  userRecord: TUser;
  userBalanceRecord?: TUserBalanceRecord;
  userBalanceLedgerRecords: TUserBalanceLedgerRecord[];
};
type TUserBalanceDetailsOnUserIdLookup = { [k: string]: TUserBalanceDetails };

const buildUserBalanceDetailsOnUserIdLookup = (p: {
  userRecords: TUser[];
  userBalanceRecords: TUserBalanceRecord[];
  userBalanceLedgerRecords: TUserBalanceLedgerRecord[];
}): TUserBalanceDetailsOnUserIdLookup => {
  const rtn: TUserBalanceDetailsOnUserIdLookup = {};
  p.userRecords.forEach((userRecord) => {
    rtn[userRecord.id] = { userRecord, userBalanceRecord: undefined, userBalanceLedgerRecords: [] };
  });
  p.userBalanceRecords.forEach((userBalanceRecord) => {
    const value = rtn[userBalanceRecord.userId];
    if (value) value.userBalanceRecord = userBalanceRecord;
  });
  p.userBalanceLedgerRecords.forEach((userBalanceLedgerRecord) => {
    const value = rtn[userBalanceLedgerRecord.userId];
    if (value) value.userBalanceLedgerRecords.push(userBalanceLedgerRecord);
  });
  return rtn;
};

function formatTokens(amount: number): string {
  const internationalisedAmount = new Intl.NumberFormat("en-US").format(Math.abs(amount));

  return `${amount >= 0 ? "+" : "-"}${internationalisedAmount}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DisplayUserBalanceLedgerRecord(p: { userBalanceLedgerRecord: TUserBalanceLedgerRecord }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-full",
            p.userBalanceLedgerRecord.tokenAmount >= 0
              ? "bg-primary/10"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {p.userBalanceLedgerRecord.tokenAmount >= 0 ? (
            <ArrowDownLeft className="size-3.5" />
          ) : (
            <ArrowUpRight className="size-3.5" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{p.userBalanceLedgerRecord.reason}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(p.userBalanceLedgerRecord.created)}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "font-mono text-sm font-medium",
          p.userBalanceLedgerRecord.tokenAmount >= 0 ? "text-primary" : "text-destructive",
        )}
      >
        {formatTokens(p.userBalanceLedgerRecord.tokenAmount)}
      </span>
    </div>
  );
}

function UserManagementTableRow(p: {
  userBalanceDetails: TUserBalanceDetails;
  onAdjustButtonClick: () => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <TableRow className={cn(isOpen && "border-b-0 bg-muted/30")}>
        <TableCell>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <ChevronDown /> : <ChevronRight />}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{p.userBalanceDetails.userRecord.name}</TableCell>
        <TableCell className="text-muted-foreground">
          {p.userBalanceDetails.userRecord.email}
        </TableCell>
        <TableCell>
          {formatTokens(p.userBalanceDetails.userBalanceRecord?.tokenAmount ?? 0)}
        </TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={p.onAdjustButtonClick} className="gap-1.5">
            <Settings2 className="size-3.5" />
            Adjust
          </Button>
        </TableCell>
      </TableRow>

      {isOpen && (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="space-y-2">
              {p.userBalanceDetails.userBalanceLedgerRecords.map((userBalanceLedgerRecord) => (
                <DisplayUserBalanceLedgerRecord
                  key={userBalanceLedgerRecord.id}
                  userBalanceLedgerRecord={userBalanceLedgerRecord}
                />
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

const AdjustUserBalanceForm = (p: {
  userRecord: TUser;
  userBalanceRecord?: TUserBalanceRecord;
  onSuccess: (messages: string[]) => void;
  onError: (messages: string[]) => void;
}) => {
  const [tokenAmount, setTokenAmount] = React.useState(0);
  const [reason, setReason] = React.useState("admin_adjustment");

  const currentBalance = p.userBalanceRecord?.tokenAmount ?? 0;

  const resultingBalance = currentBalance + tokenAmount;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const userId = p.userRecord.id;
        const resp = await createAdminAdjustmentUserBalanceLedgerRecord({
          pb,
          data: { userId, tokenAmount },
        });
        const onCompleteFn = resp.success ? p.onSuccess : p.onError;
        onCompleteFn(resp.messages);
      }}
      className="flex flex-col gap-6"
    >
      <FieldGroup className="flex flex-col gap-6">
        <div className="flex gap-4">
          <div>
            <Field>
              <FieldLabel>Current balance</FieldLabel>
              <div className="font-mono text-sm text-muted-foreground">
                {formatTokens(currentBalance)}
              </div>
            </Field>
          </div>

          <div className="border-l"></div>

          <div>
            <Field>
              <FieldLabel>Resulting balance</FieldLabel>

              <div className="flex justify-between gap-6">
                <div className="font-mono text-base font-semibold">
                  {formatTokens(resultingBalance)}
                </div>

                <div
                  className={cn(
                    "text-xs mt-1",
                    tokenAmount >= 0 ? "text-primary" : "text-destructive",
                  )}
                >
                  {(() => {
                    if (tokenAmount === 0) return "no change";
                    return formatTokens(tokenAmount);
                  })()}
                </div>
              </div>
            </Field>
          </div>
        </div>

        <Field>
          <FieldLabel>Adjustment</FieldLabel>
          <NumberInput
            placeholder="e.g. +500 or -200"
            value={tokenAmount}
            onValueChange={(num) => setTokenAmount(num)}
          />
        </Field>

        <Field>
          <FieldLabel>Reason</FieldLabel>
          <Input disabled value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </FieldGroup>

      <div className="flex justify-end">
        <Button disabled={tokenAmount === 0} type="submit">
          Confirm Adjustment
        </Button>
      </div>
    </form>
  );
};

export function ManageUserBalancesTable() {
  const modalStore = useModalStore();
  useUserStore();
  const userRecordsStore = useUserRecordsStore();
  const userRecords = userRecordsStore.data;

  const userBalanceRecordsStore = useUserBalanceRecordsStore();
  const userBalanceRecords = userBalanceRecordsStore.data;

  const userBalanceLedgerRecordsStore = useUserBalanceLedgerRecordsStore();
  const userBalanceLedgerRecords = userBalanceLedgerRecordsStore.data;

  if (userRecords === undefined) return <div>Loading</div>;
  if (userRecords === null) return <div>Error</div>;
  if (userBalanceRecords === undefined) return <div>Loading</div>;
  if (userBalanceRecords === null) return <div>Error</div>;
  if (userBalanceLedgerRecords === undefined) return <div>Loading</div>;
  if (userBalanceLedgerRecords === null) return <div>Error</div>;

  const userAccountSummaryOnUserIdLookup = buildUserBalanceDetailsOnUserIdLookup({
    userRecords,
    userBalanceRecords,
    userBalanceLedgerRecords,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        <div className="flex items-center gap-2">
          <Users />
          {userRecords.length}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead />
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Tokens</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>

        <TableBody>
          {Object.values(userAccountSummaryOnUserIdLookup).map((userAccountSummary) => (
            <UserManagementTableRow
              key={userAccountSummary.userRecord.id}
              userBalanceDetails={userAccountSummary}
              onAdjustButtonClick={() => {
                modalStore.setData(
                  <>
                    <ModalContent
                      title={"Adjust Token Balance"}
                      description={`Update balance for ${userAccountSummary.userRecord.name}. Use positive values to add,
                      negative to remove`}
                    >
                      <AdjustUserBalanceForm
                        onSuccess={(messages) => {
                          toast.success(...createToastProps(messages));
                          modalStore.setData(null);
                        }}
                        onError={(messages) => {
                          toast.error(...createToastProps(messages));
                        }}
                        userRecord={userAccountSummary.userRecord}
                        userBalanceRecord={userAccountSummary.userBalanceRecord}
                      />
                    </ModalContent>
                  </>,
                );
              }}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
