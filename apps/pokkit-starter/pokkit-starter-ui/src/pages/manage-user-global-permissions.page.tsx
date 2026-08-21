import { pb } from "@/config/pocketbaseConfig";
import { createToastProps } from "@/lib/createToastProps";
import { TGlobalUserPermission, TUser, useUserRecordsStore, useUserStore } from "@repo/pokkit-auth";
import {
  createGlobalUserPermissionRecord,
  updateGlobalUserPermissionRecord,
} from "@repo/pokkit-db-permissions-ts-helpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/pokkit-shadcn";
import { useState } from "react";
import { toast } from "sonner";
import { useGlobalUserPermissionsStore } from "@repo/pokkit-auth";

const statusColorClassMap: { [k in TGlobalUserPermission["status"]]: string } = {
  pending: "bg-muted",
  approved: "bg-green-500",
  blocked: "bg-destructive",
} as const;

const GlobalUserPermissionStatusSelect = (p: {
  globalUserPermission?: TGlobalUserPermission;
  onStatusChange: (x: TGlobalUserPermission["status"]) => void;
  disabled?: boolean;
}) => {
  return (
    <>
      <Select
        value={p.globalUserPermission?.status ?? "pending"}
        onValueChange={(status: TGlobalUserPermission["status"]) => p.onStatusChange(status)}
        disabled={p.disabled}
      >
        <SelectTrigger
          className={`w-[180px] ${statusColorClassMap[p.globalUserPermission?.status ?? "pending"]}`}
        >
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
};

const GlobalUserPermissionRoleSelect = (p: {
  globalUserPermission?: TGlobalUserPermission;
  onRoleChange: (x: TGlobalUserPermission["role"]) => void;
  disabled?: boolean;
}) => {
  return (
    <Select
      value={p.globalUserPermission?.role ?? "standard"}
      onValueChange={(role: TGlobalUserPermission["role"]) => p.onRoleChange(role)}
      disabled={p.disabled}
    >
      <SelectTrigger className={`w-[180px]`}>
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="superadmin">Superadmin</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="standard">Standard</SelectItem>
      </SelectContent>
    </Select>
  );
};

const ManageUserGlobalPermissionsTableRow = (p: {
  userRecord: TUser;
  globalUserPermission?: TGlobalUserPermission;
}) => {
  const [loading, setLoading] = useState(false);

  return (
    <TableRow>
      <TableCell>{p.userRecord.name}</TableCell>
      <TableCell>{p.userRecord.email}</TableCell>
      <TableCell>
        <GlobalUserPermissionRoleSelect
          disabled={loading}
          globalUserPermission={p.globalUserPermission}
          onRoleChange={async (role) => {
            setLoading(true);
            const resp = await (() => {
              if (!!p.globalUserPermission) {
                const globalUserPermission = { ...p.globalUserPermission, role };
                return updateGlobalUserPermissionRecord({ pb, globalUserPermission });
              }

              return createGlobalUserPermissionRecord({
                pb,
                globalUserPermission: { userId: p.userRecord.id, role, status: "pending" },
              });
            })();
            const toastFn = resp.success ? toast.success : toast.error;
            toastFn(...createToastProps(resp.messages));

            setLoading(false);
          }}
        />
      </TableCell>
      <TableCell>
        <GlobalUserPermissionStatusSelect
          disabled={loading}
          globalUserPermission={p.globalUserPermission}
          onStatusChange={async (status) => {
            setLoading(true);

            const resp = await (() => {
              if (!!p.globalUserPermission) {
                const globalUserPermission = { ...p.globalUserPermission, status };
                return updateGlobalUserPermissionRecord({ pb, globalUserPermission });
              }

              return createGlobalUserPermissionRecord({
                pb,
                globalUserPermission: { userId: p.userRecord.id, role: "standard", status },
              });
            })();
            const toastFn = resp.success ? toast.success : toast.error;
            toastFn(...createToastProps(resp.messages));

            setLoading(false);
          }}
        />
      </TableCell>
    </TableRow>
  );
};

export default function Page() {
  const userStore = useUserStore();
  const user = userStore.data;

  const userRecordsStore = useUserRecordsStore();
  const userRecords = userRecordsStore.data;

  const globalUserPermissionsStore = useGlobalUserPermissionsStore();
  const globalUserPermissions = globalUserPermissionsStore.data;

  if (user === undefined) return <div>Loading</div>;
  if (user === null) return <div>Error</div>;
  if (userRecords === undefined) return <div>Loading</div>;
  if (userRecords === null) return <div>Error</div>;
  if (globalUserPermissions === undefined) return <div>Loading</div>;
  if (globalUserPermissions === null) return <div>Error</div>;

  const globalUserPermissionsByUserIdLookup: Record<string, TGlobalUserPermission> = {};
  globalUserPermissions.forEach((globalUserPermission) => {
    globalUserPermissionsByUserIdLookup[globalUserPermission.userId] = globalUserPermission;
  });

  return (
    <div>
      <h1>Manage User Global Permissions</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userRecords.map((userRecord) => {
            const globalUserPermission = globalUserPermissionsByUserIdLookup[userRecord.id];
            return (
              <ManageUserGlobalPermissionsTableRow
                key={userRecord.id}
                userRecord={userRecord}
                globalUserPermission={globalUserPermission}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
