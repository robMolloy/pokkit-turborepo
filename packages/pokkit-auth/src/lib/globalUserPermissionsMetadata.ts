import z from "zod";

export const globalUserPermissionsCollectionName = "globalUserPermissions";

export const globalUserPermissionSchema = z.object({
  id: z.string(),
  role: z.enum(["standard", "admin", "superadmin"]),
  status: z.enum(["blocked", "approved", "pending"]),
  userId: z.string(),
  created: z.string(),
  updated: z.string(),
});

export type TGlobalUserPermission = z.infer<typeof globalUserPermissionSchema>;
