import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Settings2,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  FieldGroup,
  Field,
  FieldLabel,
} from "@repo/pokkit-shadcn";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  date: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  tokens: number;
  status: "active" | "inactive" | "pending";
  transactions: Transaction[];
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    tokens: 15420,
    status: "active",
    transactions: [
      {
        id: "t1",
        type: "credit",
        amount: 500,
        description: "Monthly allocation",
        date: "2026-04-01",
      },
      { id: "t2", type: "debit", amount: 150, description: "API usage", date: "2026-03-28" },
      { id: "t3", type: "credit", amount: 1000, description: "Bonus reward", date: "2026-03-15" },
    ],
  },
  {
    id: "2",
    name: "Marcus Johnson",
    email: "marcus.j@example.com",
    tokens: 8750,
    status: "active",
    transactions: [
      { id: "t4", type: "debit", amount: 200, description: "Feature access", date: "2026-04-02" },
      {
        id: "t5",
        type: "credit",
        amount: 500,
        description: "Monthly allocation",
        date: "2026-04-01",
      },
    ],
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.r@example.com",
    tokens: 3200,
    status: "pending",
    transactions: [
      {
        id: "t6",
        type: "credit",
        amount: 3200,
        description: "Initial signup bonus",
        date: "2026-03-30",
      },
    ],
  },
  {
    id: "4",
    name: "James Wilson",
    email: "james.wilson@example.com",
    tokens: 0,
    status: "inactive",
    transactions: [
      { id: "t7", type: "debit", amount: 500, description: "Account closure", date: "2026-02-15" },
    ],
  },
  {
    id: "5",
    name: "Aisha Patel",
    email: "aisha.patel@example.com",
    tokens: 24100,
    status: "active",
    transactions: [
      {
        id: "t8",
        type: "credit",
        amount: 5000,
        description: "Enterprise bonus",
        date: "2026-04-03",
      },
      {
        id: "t9",
        type: "credit",
        amount: 500,
        description: "Monthly allocation",
        date: "2026-04-01",
      },
      {
        id: "t10",
        type: "debit",
        amount: 800,
        description: "Premium features",
        date: "2026-03-25",
      },
      {
        id: "t11",
        type: "credit",
        amount: 2000,
        description: "Referral bonus",
        date: "2026-03-20",
      },
    ],
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

function StatusBadge({ status }: { status: User["status"] }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "size-2 rounded-full",
          status === "active" && "bg-primary",
          status === "inactive" && "bg-muted-foreground",
          status === "pending" && "bg-yellow-500",
        )}
      />
      <span className="text-sm capitalize text-muted-foreground">{status}</span>
    </div>
  );
}

interface UserRowProps {
  user: User;
  onAdjust: (user: User) => void;
}

function UserRow({ user, onAdjust }: UserRowProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <TableRow className={cn(isOpen && "border-b-0 bg-muted/30")}>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label="Toggle transactions"
          >
            {isOpen ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{user.name}</TableCell>
        <TableCell className="text-muted-foreground">{user.email}</TableCell>
        <TableCell>
          <span className="font-mono font-medium text-primary">{formatTokens(user.tokens)}</span>
        </TableCell>
        <TableCell>
          <StatusBadge status={user.status} />
        </TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={() => onAdjust(user)} className="gap-1.5">
            <Settings2 className="size-3.5" />
            Adjust
          </Button>
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={6} className="p-0">
            <div className="border-b bg-muted/20 px-4 py-3 pl-12">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Recent Transactions
                </span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {user.transactions.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {user.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full",
                          tx.type === "credit"
                            ? "bg-primary/10 text-primary"
                            : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {tx.type === "credit" ? (
                          <ArrowDownLeft className="size-3.5" />
                        ) : (
                          <ArrowUpRight className="size-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "font-mono text-sm font-medium",
                        tx.type === "credit" ? "text-primary" : "text-destructive",
                      )}
                    >
                      {tx.type === "credit" ? "+" : "-"}
                      {formatTokens(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function UserManagementTable() {
  const [users, setUsers] = React.useState<User[]>(mockUsers);
  const [adjustDialogOpen, setAdjustDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = React.useState("");
  const [adjustReason, setAdjustReason] = React.useState("");

  const handleAdjust = (user: User) => {
    setSelectedUser(user);
    setAdjustAmount("");
    setAdjustReason("");
    setAdjustDialogOpen(true);
  };

  const handleConfirmAdjust = () => {
    if (!selectedUser || !adjustAmount) return;

    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount)) return;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? {
              ...u,
              tokens: u.tokens + amount,
              transactions: [
                {
                  id: `t${Date.now()}`,
                  type: amount >= 0 ? "credit" : "debit",
                  amount: Math.abs(amount),
                  description: adjustReason || "Manual adjustment",
                  date: new Date().toISOString().split("T")[0],
                },
                ...u.transactions,
              ],
            }
          : u,
      ),
    );

    setAdjustDialogOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage user accounts and token balances</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{users.length} users</span>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12" />
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <UserRow key={user.id} user={user} onAdjust={handleAdjust} />
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Token Balance</DialogTitle>
            <DialogDescription>
              Adjust the token balance for {selectedUser?.name}. Use positive numbers to add tokens,
              negative to remove.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Current Balance</FieldLabel>
              <div className="flex h-9 items-center rounded-md border bg-muted px-3 font-mono text-sm">
                {selectedUser ? formatTokens(selectedUser.tokens) : 0}
              </div>
            </Field>
            <Field>
              <FieldLabel>Adjustment Amount</FieldLabel>
              <Input
                type="number"
                placeholder="e.g. 500 or -200"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Reason</FieldLabel>
              <Input
                placeholder="Reason for adjustment"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </Field>
          </FieldGroup>
          {adjustAmount && !isNaN(parseInt(adjustAmount, 10)) && selectedUser && (
            <div className="rounded-md border bg-muted/50 px-3 py-2">
              <p className="text-sm text-muted-foreground">
                New balance will be:{" "}
                <span className="font-mono font-medium text-foreground">
                  {formatTokens(selectedUser.tokens + parseInt(adjustAmount, 10))}
                </span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAdjust}
              disabled={!adjustAmount || isNaN(parseInt(adjustAmount, 10))}
            >
              Confirm Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
