import { extractMessageFromPbError } from "@repo/pokkit-auth";
import PocketBase from "pocketbase";
import {
  globalUserPermissionSchema,
  globalUserPermissionsCollectionName,
  type TGlobalUserPermission,
  type TGlobalUserPermissionsCreatePayload,
} from "../..";

export const updateGlobalUserPermissionRecord = async (p: {
  pb: PocketBase;
  globalUserPermission: TGlobalUserPermission;
}) => {
  try {
    const resp = await p.pb
      .collection(globalUserPermissionsCollectionName)
      .update(p.globalUserPermission.id, p.globalUserPermission);

    const data = globalUserPermissionSchema.parse(resp);
    const messages = ["successfully updated global user permissions"];

    return { success: true, data, messages } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });
    const messages = [
      "failed to update global user permissions",
      ...(messagesResp ? messagesResp : []),
    ];
    return { success: false, error, messages } as const;
  }
};
export const createGlobalUserPermissionRecord = async (p: {
  pb: PocketBase;
  globalUserPermission: TGlobalUserPermissionsCreatePayload;
}) => {
  try {
    const resp = await p.pb
      .collection(globalUserPermissionsCollectionName)
      .create(p.globalUserPermission);

    const data = globalUserPermissionSchema.parse(resp);
    const messages = ["successfully created global user permissions"];

    return { success: true, data, messages } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });
    const messages = [
      "failed to create global user permissions",
      ...(messagesResp ? messagesResp : []),
    ];
    return { success: false, error, messages } as const;
  }
};
