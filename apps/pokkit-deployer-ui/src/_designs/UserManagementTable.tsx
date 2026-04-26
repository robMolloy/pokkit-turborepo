import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import {
  TStripeLedgerRecord,
  useStripeLedgerRecordsStore,
} from "@/modules/instanceRecords/dbStripeLedgerRecords";
import {
  TUserBalanceRecord,
  useUserBalanceRecordsStore,
} from "@/modules/instanceRecords/dbUserBalanceRecords";
import { TUser, useUserRecordsStore } from "@repo/pokkit-auth";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/pokkit-shadcn";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronRight, Users } from "lucide-react";
import * as React from "react";

type TUserBalanceDetails = {
  userRecord: TUser;
  userBalanceRecord?: TUserBalanceRecord;
  userBalanceLedgerRecords: TStripeLedgerRecord[];
};
type TUserBalanceDetailsOnUserIdLookup = { [k: string]: TUserBalanceDetails };

const buildUserBalanceDetailsOnUserIdLookup = (p: {
  userRecords: TUser[];
  userBalanceRecords: TUserBalanceRecord[];
  userBalanceLedgerRecords: TStripeLedgerRecord[];
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

function DisplayUserBalanceLedgerRecord(p: { userBalanceLedgerRecord: TStripeLedgerRecord }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-full",
            p.userBalanceLedgerRecord.quantity >= 0
              ? "bg-primary/10"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {p.userBalanceLedgerRecord.quantity >= 0 ? (
            <ArrowDownLeft className="size-3.5" />
          ) : (
            <ArrowUpRight className="size-3.5" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">
            {formatTokens(p.userBalanceLedgerRecord.quantity)}{" "}
            {p.userBalanceLedgerRecord.productName}(s)
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(p.userBalanceLedgerRecord.created)}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "font-mono text-sm font-medium",
          p.userBalanceLedgerRecord.quantity >= 0 ? "text-primary" : "text-destructive",
        )}
      >
        {p.userBalanceLedgerRecord.amountTotal} {p.userBalanceLedgerRecord.currency}
      </span>
    </div>
  );
}

function UserManagementTableRow(p: { userBalanceDetails: TUserBalanceDetails }) {
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
      </TableRow>

      {isOpen && (
        <TableRow>
          <TableCell colSpan={4}>
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

export function ManageUserBalancesTable() {
  const userRecordsStore = useUserRecordsStore();
  const userRecords = userRecordsStore.data;

  const userBalanceRecordsStore = useUserBalanceRecordsStore();
  const userBalanceRecords = userBalanceRecordsStore.data;

  const userBalanceLedgerRecordsStore = useStripeLedgerRecordsStore();
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
          </TableRow>
        </TableHeader>

        <TableBody>
          {Object.values(userAccountSummaryOnUserIdLookup).map((userAccountSummary) => (
            <UserManagementTableRow
              key={userAccountSummary.userRecord.id}
              userBalanceDetails={userAccountSummary}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
