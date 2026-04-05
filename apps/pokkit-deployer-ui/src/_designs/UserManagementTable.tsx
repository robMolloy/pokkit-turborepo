import { cn } from "@/lib/utils";
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
import z from "zod";

const userBalanceRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tokenAmount: z.number(),
  created: z.string(),
  updated: z.string(),
});
type TUserBalanceRecord = z.infer<typeof userBalanceRecordSchema>;
const userBalanceLedgerRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tokenAmount: z.number(),
  reason: z.string(),
  paymentIntentId: z.string().nullish(),
  instanceId: z.string().nullish(),
  created: z.string(),
  updated: z.string(),
});
type TUserBalanceLedgerRecord = z.infer<typeof userBalanceLedgerRecordSchema>;

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

const mockUserBalanceRecords: TUserBalanceRecord[] = [
  { id: "b1", userId: "1", tokenAmount: 15420, created: "2026-04-01", updated: "2026-04-01" },
  { id: "b2", userId: "2", tokenAmount: 8750, created: "2026-04-01", updated: "2026-04-01" },
  { id: "b3", userId: "3", tokenAmount: 3200, created: "2026-04-01", updated: "2026-04-01" },
  { id: "b4", userId: "4", tokenAmount: 0, created: "2026-04-01", updated: "2026-04-01" },
  { id: "b5", userId: "5", tokenAmount: 24100, created: "2026-04-01", updated: "2026-04-01" },
];

const mockUserBalanceLedgerRecords: TUserBalanceLedgerRecord[] = [
  {
    id: "t1",
    userId: "1",
    tokenAmount: 500,
    reason: "admin_adjustment",
    created: "2026-04-01",
    updated: "2026-04-01",
  },
  {
    id: "t2",
    userId: "1",
    tokenAmount: 150,
    reason: "admin_adjustment",
    created: "2026-03-28",
    updated: "2026-03-28",
  },
  {
    id: "t3",
    userId: "1",
    tokenAmount: 1000,
    reason: "admin_adjustment",
    created: "2026-03-15",
    updated: "2026-03-15",
  },
  {
    id: "t4",
    userId: "2",
    tokenAmount: 200,
    reason: "admin_adjustment",
    created: "2026-04-02",
    updated: "2026-04-02",
  },
  {
    id: "t5",
    userId: "2",
    tokenAmount: 500,
    reason: "admin_adjustment",
    created: "2026-04-01",
    updated: "2026-04-01",
  },
  {
    id: "t6",
    userId: "3",
    tokenAmount: 3200,
    reason: "admin_adjustment",
    created: "2026-03-30",
    updated: "2026-03-30",
  },
  {
    id: "t7",
    userId: "4",
    tokenAmount: 500,
    reason: "admin_adjustment",
    created: "2026-02-15",
    updated: "2026-02-15",
  },
  {
    id: "t8",
    userId: "5",
    tokenAmount: 5000,
    reason: "admin_adjustment",
    created: "2026-04-03",
    updated: "2026-04-03",
  },
  {
    id: "t9",
    userId: "5",
    tokenAmount: 500,
    reason: "admin_adjustment",
    created: "2026-04-01",
    updated: "2026-04-01",
  },
  {
    id: "t10",
    userId: "5",
    tokenAmount: 800,
    reason: "admin_adjustment",
    created: "2026-03-25",
    updated: "2026-03-25",
  },
  {
    id: "t11",
    userId: "5",
    tokenAmount: 2000,
    reason: "admin_adjustment",
    created: "2026-03-20",
    updated: "2026-03-20",
  },
];

function formatTokens(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TransactionListItem(p: { userBalanceLedgerRecord: TUserBalanceLedgerRecord }) {
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
        {p.userBalanceLedgerRecord.tokenAmount >= 0 ? "+" : "-"}
        {formatTokens(p.userBalanceLedgerRecord.tokenAmount)}
      </span>
    </div>
  );
}

function AdjustBalanceButton({ onAdjustButtonClick }: { onAdjustButtonClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onAdjustButtonClick} className="gap-1.5">
      <Settings2 className="size-3.5" />
      Adjust
    </Button>
  );
}

function UserManagementTableRow(p: {
  userAccountSummary: TUserBalanceDetails;
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
        <TableCell className="font-medium">{p.userAccountSummary.userRecord.name}</TableCell>
        <TableCell className="text-muted-foreground">
          {p.userAccountSummary.userRecord.email}
        </TableCell>
        <TableCell>
          {formatTokens(p.userAccountSummary.userBalanceRecord?.tokenAmount ?? 0)}
        </TableCell>
        <TableCell className="text-right">
          <AdjustBalanceButton onAdjustButtonClick={() => p.onAdjustButtonClick()} />
        </TableCell>
      </TableRow>

      {isOpen && (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="space-y-2">
              {p.userAccountSummary.userBalanceLedgerRecords.map((userBalanceLedgerRecord) => (
                <TransactionListItem
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
  onConfirm: (x: Pick<TUserBalanceLedgerRecord, "tokenAmount" | "reason">) => void;
}) => {
  const [tokenAmount, setTokenAmount] = React.useState(0);
  const [reason, setReason] = React.useState("admin_adjustment");

  const currentBalance = p.userBalanceRecord?.tokenAmount ?? 0;

  const resultingBalance = currentBalance + tokenAmount;

  return (
    <div className="flex flex-col gap-6">
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
                    return `${tokenAmount >= 0 ? "+" : "-"}${formatTokens(Math.abs(tokenAmount))}`;
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
        <Button disabled={tokenAmount !== 0} onClick={() => p.onConfirm({ tokenAmount, reason })}>
          Confirm Adjustment
        </Button>
      </div>
    </div>
  );
};

export function ManageUserBalancesTable() {
  const modalStore = useModalStore();
  useUserStore();
  const userRecordsStore = useUserRecordsStore();
  const userRecords = userRecordsStore.data;

  const [userBalanceRecords] = React.useState(mockUserBalanceRecords);
  const [userBalanceLedgerRecords] = React.useState(mockUserBalanceLedgerRecords);

  if (userRecords === undefined) return <div>Loading</div>;
  if (userRecords === null) return <div>Error</div>;

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
              userAccountSummary={userAccountSummary}
              onAdjustButtonClick={() => {
                modalStore.setData(
                  <>
                    <ModalContent
                      title={"Adjust Token Balance"}
                      description={`Update balance for ${userAccountSummary.userRecord.name}. Use positive values to add,
                      negative to remove`}
                    >
                      <AdjustUserBalanceForm
                        onConfirm={(x) => {
                          console.log(`UserManagementTable.tsx:${/*LL*/ 456}`, { x });
                          modalStore.setData(null);
                        }}
                        userRecord={userAccountSummary.userRecord}
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
