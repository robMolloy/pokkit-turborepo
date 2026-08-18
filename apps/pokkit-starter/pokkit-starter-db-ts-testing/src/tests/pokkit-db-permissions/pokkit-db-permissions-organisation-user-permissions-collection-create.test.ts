import {
  getPbFilePath,
  getPbServeUrl,
  killPbInstance,
  servePb,
  superusersCollectionName,
  truncatePbCollections,
  upsertPbAdminCredentialsFromCli,
} from "@repo/pokkit-testing";
import fse from "fs-extra";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PocketBase } from "../../config/pocketbaseConfig";
import { sourceTestBuildDirPath, superuserEmail, superuserPassword } from "../_constants";
import { pokkitDbPermissionsTestsMetadata } from "./_pokkitDbConfigSyncTestsMetadata";
import { userPayloadBuilder } from "@repo/pokkit-db-permissions-ts-helpers";
import {
  usersCollectionName,
  organisationsCollectionName,
  organisationsPayloadBuilder,
  organisationUserPermissionsPayloadBuilder,
  organisationUserPermissionsCollectionName,
  globalUserPermissionsPayloadBuilder,
  globalUserPermissionsCollectionName,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationUserPermissionsCollectionCreate;
const testSuiteName = testMetadata.name;

const pbPortNumber = testMetadata.portNumber;
const pbDirPath = `_sandboxes/${testSuiteName}`;
const pbFilePath = getPbFilePath({ pbDirPath });
const pbServeUrl = getPbServeUrl({ pbPortNumber });
const logFilePath = `_logs/${testSuiteName}`;

const createPbConnection = () => new PocketBase(pbServeUrl);

describe(`${testSuiteName} tests`, () => {
  beforeAll(async () => {
    await killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
    fse.copySync(sourceTestBuildDirPath, pbDirPath);

    await servePb({ pbFilePath, pbPortNumber, logFilePath });
    await upsertPbAdminCredentialsFromCli({ pbFilePath, superuserEmail, superuserPassword });
  });

  afterAll(async () => {
    killPbInstance({ pbPortNumber });
    fse.removeSync(pbDirPath);
  }, 30000);

  beforeEach(async () => {
    await truncatePbCollections({
      pbPortNumber,
      superuserEmail,
      superuserPassword,
      ignoreCollections: [superusersCollectionName],
    });
  });

  it("is connection healthy", async () => {
    const pb = createPbConnection();
    const isHealthy = await pb.health.check();
    expect(isHealthy.code).toBe(200);
  });

  it("PDBP-OUP-CREATE-01 — Global Superadmin (approved) can CREATE", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const organisationsUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });
    const organisationsUserPermissionsRecord = await superadminAndOrgAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(organisationsUserPermissionsPayload);
    expect(organisationsUserPermissionsRecord).toMatchObject(organisationsUserPermissionsPayload);
  });

  it("PDBP-OUP-CREATE-02 — Global Superadmin (pending or blocked) cannot CREATE", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const pendingAdminUserPb = createPbConnection();
    const pendingAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingAdminUserRecord = await pendingAdminUserPb
      .collection(usersCollectionName)
      .create(pendingAdminUserPayload);
    await pendingAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingAdminUserPayload.email, pendingAdminUserPayload.password);

    const pendingAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "pending",
      });

    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);

    const blockedAdminUserPb = createPbConnection();
    const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedAdminUserRecord = await blockedAdminUserPb
      .collection(usersCollectionName)
      .create(blockedAdminUserPayload);
    await blockedAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.password);
    const blockedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      });

    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    await expect(
      pendingAdminUserPb.collection(organisationUserPermissionsCollectionName).create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisationRecord.id,
          userId: blockedAdminUserRecord.id,
          role: "admin",
          status: "blocked",
        }),
      ),
    ).rejects.toThrow();
    await expect(
      blockedAdminUserPb.collection(organisationUserPermissionsCollectionName).create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisationRecord.id,
          userId: blockedAdminUserRecord.id,
          role: "admin",
          status: "blocked",
        }),
      ),
    ).rejects.toThrow();
  });
  it("PDBP-OUP-CREATE-03 — Global Admin (approved, pending, or blocked) cannot CREATE", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const approvedAdminUserPb = createPbConnection();
    const approvedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedAdminUserRecord = await approvedAdminUserPb
      .collection(usersCollectionName)
      .create(approvedAdminUserPayload);
    await approvedAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(approvedAdminUserPayload.email, approvedAdminUserPayload.password);

    const approvedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedAdminUserRecord.id,
        role: "admin",
        status: "approved",
      });

    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(approvedAdminGlobalUserPermissionsPayload);

    const pendingAdminUserPb = createPbConnection();
    const pendingAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingAdminUserRecord = await pendingAdminUserPb
      .collection(usersCollectionName)
      .create(pendingAdminUserPayload);
    await pendingAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingAdminUserPayload.email, pendingAdminUserPayload.password);

    const pendingAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "pending",
      });

    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingAdminGlobalUserPermissionsPayload);

    const blockedAdminUserPb = createPbConnection();
    const blockedAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedAdminUserRecord = await blockedAdminUserPb
      .collection(usersCollectionName)
      .create(blockedAdminUserPayload);
    await blockedAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedAdminUserPayload.email, blockedAdminUserPayload.password);
    const blockedAdminGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      });

    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedAdminGlobalUserPermissionsPayload);

    const promoteApprovedAdminUserToOrgAdminPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: approvedAdminUserRecord.id,
        role: "admin",
        status: "approved",
      });
    const promotePendingAdminUserToOrgAdminPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: pendingAdminUserRecord.id,
        role: "admin",
        status: "approved",
      });
    const promoteBlockedAdminUserToOrgAdminPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: blockedAdminUserRecord.id,
        role: "admin",
        status: "approved",
      });

    await expect(
      approvedAdminUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promoteApprovedAdminUserToOrgAdminPayload),
    ).rejects.toThrow();
    await expect(
      approvedAdminUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promotePendingAdminUserToOrgAdminPayload),
    ).rejects.toThrow();
    await expect(
      approvedAdminUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promoteBlockedAdminUserToOrgAdminPayload),
    ).rejects.toThrow();

    await expect(
      pendingAdminUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promoteApprovedAdminUserToOrgAdminPayload),
    ).rejects.toThrow();
    await expect(
      pendingAdminUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promotePendingAdminUserToOrgAdminPayload),
    ).rejects.toThrow();
    await expect(
      pendingAdminUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promoteBlockedAdminUserToOrgAdminPayload),
    ).rejects.toThrow();

    await expect(
      blockedAdminUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promoteApprovedAdminUserToOrgAdminPayload),
    ).rejects.toThrow();
    await expect(
      blockedAdminUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promotePendingAdminUserToOrgAdminPayload),
    ).rejects.toThrow();
    await expect(
      blockedAdminUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promoteBlockedAdminUserToOrgAdminPayload),
    ).rejects.toThrow();
  });
  it("PDBP-OUP-CREATE-04 — Global Standard (approved, pending, or blocked) cannot CREATE", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const approvedStandardUserPb = createPbConnection();
    const approvedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedStandardUserRecord = await approvedStandardUserPb
      .collection(usersCollectionName)
      .create(approvedStandardUserPayload);
    await approvedStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(approvedStandardUserPayload.email, approvedStandardUserPayload.password);

    const approvedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: approvedStandardUserRecord.id,
        role: "standard",
        status: "approved",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(approvedStandardGlobalUserPermissionsPayload);

    const pendingStandardUserPb = createPbConnection();
    const pendingStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingStandardUserRecord = await pendingStandardUserPb
      .collection(usersCollectionName)
      .create(pendingStandardUserPayload);
    await pendingStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingStandardUserPayload.email, pendingStandardUserPayload.password);
    const pendingStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: pendingStandardUserRecord.id,
        role: "standard",
        status: "pending",
      });

    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(pendingStandardGlobalUserPermissionsPayload);

    const blockedStandardUserPb = createPbConnection();
    const blockedStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedStandardUserRecord = await blockedStandardUserPb
      .collection(usersCollectionName)
      .create(blockedStandardUserPayload);
    await blockedStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedStandardUserPayload.email, blockedStandardUserPayload.password);
    const blockedStandardGlobalUserPermissionsPayload =
      globalUserPermissionsPayloadBuilder.forCreateData({
        userId: blockedStandardUserRecord.id,
        role: "standard",
        status: "blocked",
      });
    await superadminAndOrgAdminPb
      .collection(globalUserPermissionsCollectionName)
      .create(blockedStandardGlobalUserPermissionsPayload);

    const promoteApprovedStandardUserToOrgAdminPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: approvedStandardUserRecord.id,
        role: "admin",
        status: "approved",
      });
    const promotePendingStandardUserToOrgAdminPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: pendingStandardUserRecord.id,
        role: "admin",
        status: "approved",
      });
    const promoteBlockedStandardUserToOrgAdminPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: blockedStandardUserRecord.id,
        role: "admin",
        status: "approved",
      });

    await expect(
      approvedStandardUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promoteApprovedStandardUserToOrgAdminPayload),
    ).rejects.toThrow();
    await expect(
      approvedStandardUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promotePendingStandardUserToOrgAdminPayload),
    ).rejects.toThrow();
    await expect(
      approvedStandardUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promoteBlockedStandardUserToOrgAdminPayload),
    ).rejects.toThrow();

    await expect(
      pendingStandardUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promoteApprovedStandardUserToOrgAdminPayload),
    ).rejects.toThrow();
    await expect(
      pendingStandardUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promotePendingStandardUserToOrgAdminPayload),
    ).rejects.toThrow();
    await expect(
      pendingStandardUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promoteBlockedStandardUserToOrgAdminPayload),
    ).rejects.toThrow();

    await expect(
      blockedStandardUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promoteApprovedStandardUserToOrgAdminPayload),
    ).rejects.toThrow();
    await expect(
      blockedStandardUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promotePendingStandardUserToOrgAdminPayload),
    ).rejects.toThrow();
    await expect(
      blockedStandardUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(promoteBlockedStandardUserToOrgAdminPayload),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-CREATE-AS-MEMBER-01 — Organisation Admin (approved) can CREATE AS MEMBER", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const approvedOrgAdminUserPb = createPbConnection();
    const approvedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrgAdminUserRecord = await approvedOrgAdminUserPb
      .collection(usersCollectionName)
      .create(approvedOrgAdminUserPayload);
    await approvedOrgAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(approvedOrgAdminUserPayload.email, approvedOrgAdminUserPayload.password);

    await superadminAndOrgAdminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: approvedOrgAdminUserRecord.id,
        role: "admin",
        status: "approved",
      }),
    );

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    await user1Pb
      .collection(usersCollectionName)
      .authWithPassword(user1UserPayload.email, user1UserPayload.password);

    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });

    await expect(
      approvedOrgAdminUserPb
        .collection(organisationUserPermissionsCollectionName)
        .create(user1OrganisationUserPermissionsPayload),
    ).resolves.toMatchObject(user1OrganisationUserPermissionsPayload);
  });
  it("PDBP-OUP-CREATE-AS-MEMBER-02 — Organisation Admin (pending or blocked) cannot CREATE AS MEMBER", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const pendingOrgAdminUserPb = createPbConnection();
    const pendingOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrgAdminUserRecord = await pendingOrgAdminUserPb
      .collection(usersCollectionName)
      .create(pendingOrgAdminUserPayload);
    await pendingOrgAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingOrgAdminUserPayload.email, pendingOrgAdminUserPayload.password);

    await superadminAndOrgAdminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: pendingOrgAdminUserRecord.id,
        role: "admin",
        status: "pending",
      }),
    );

    const blockedOrgAdminUserPb = createPbConnection();
    const blockedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgAdminUserRecord = await blockedOrgAdminUserPb
      .collection(usersCollectionName)
      .create(blockedOrgAdminUserPayload);
    await blockedOrgAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedOrgAdminUserPayload.email, blockedOrgAdminUserPayload.password);

    await superadminAndOrgAdminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: blockedOrgAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      }),
    );

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .create(user1OrganisationUserPermissionsPayload);

    await expect(testFn({ pb: pendingOrgAdminUserPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedOrgAdminUserPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionsPayload,
    );
  });
  it("PDBP-OUP-CREATE-AS-MEMBER-03 — Organisation Standard (approved, pending, or blocked) cannot CREATE AS MEMBER", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisationRecord = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const approvedOrgStandardUserPb = createPbConnection();
    const approvedOrgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrgStandardUserRecord = await approvedOrgStandardUserPb
      .collection(usersCollectionName)
      .create(approvedOrgStandardUserPayload);
    await approvedOrgStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(
        approvedOrgStandardUserPayload.email,
        approvedOrgStandardUserPayload.password,
      );

    await superadminAndOrgAdminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: approvedOrgStandardUserRecord.id,
        role: "standard",
        status: "approved",
      }),
    );

    const pendingOrgStandardUserPb = createPbConnection();
    const pendingOrgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrgStandardUserRecord = await pendingOrgStandardUserPb
      .collection(usersCollectionName)
      .create(pendingOrgStandardUserPayload);
    await pendingOrgStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(
        pendingOrgStandardUserPayload.email,
        pendingOrgStandardUserPayload.password,
      );

    await superadminAndOrgAdminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: pendingOrgStandardUserRecord.id,
        role: "standard",
        status: "pending",
      }),
    );

    const blockedOrgStandardUserPb = createPbConnection();
    const blockedOrgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgStandardUserRecord = await blockedOrgStandardUserPb
      .collection(usersCollectionName)
      .create(blockedOrgStandardUserPayload);
    await blockedOrgStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(
        blockedOrgStandardUserPayload.email,
        blockedOrgStandardUserPayload.password,
      );

    await superadminAndOrgAdminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: blockedOrgStandardUserRecord.id,
        role: "standard",
        status: "blocked",
      }),
    );

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisationRecord.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .create(user1OrganisationUserPermissionsPayload);

    await expect(testFn({ pb: approvedOrgStandardUserPb })).rejects.toThrow();
    await expect(testFn({ pb: pendingOrgStandardUserPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedOrgStandardUserPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionsPayload,
    );
  });

  it("PDBP-OUP-CREATE-AS-NON-MEMBER-01 — Organisation Admin (approved, pending, or blocked) cannot CREATE AS NON-MEMBER", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisation1Record = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation2Record = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const approvedOrgAdminUserPb = createPbConnection();
    const approvedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrgAdminUserRecord = await approvedOrgAdminUserPb
      .collection(usersCollectionName)
      .create(approvedOrgAdminUserPayload);
    await approvedOrgAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(approvedOrgAdminUserPayload.email, approvedOrgAdminUserPayload.password);

    await superadminAndOrgAdminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisation1Record.id,
        userId: approvedOrgAdminUserRecord.id,
        role: "admin",
        status: "approved",
      }),
    );

    const pendingOrgAdminUserPb = createPbConnection();
    const pendingOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrgAdminUserRecord = await pendingOrgAdminUserPb
      .collection(usersCollectionName)
      .create(pendingOrgAdminUserPayload);
    await pendingOrgAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(pendingOrgAdminUserPayload.email, pendingOrgAdminUserPayload.password);

    await superadminAndOrgAdminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisation1Record.id,
        userId: pendingOrgAdminUserRecord.id,
        role: "admin",
        status: "pending",
      }),
    );

    const blockedOrgAdminUserPb = createPbConnection();
    const blockedOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgAdminUserRecord = await blockedOrgAdminUserPb
      .collection(usersCollectionName)
      .create(blockedOrgAdminUserPayload);
    await blockedOrgAdminUserPb
      .collection(usersCollectionName)
      .authWithPassword(blockedOrgAdminUserPayload.email, blockedOrgAdminUserPayload.password);

    await superadminAndOrgAdminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisation1Record.id,
        userId: blockedOrgAdminUserRecord.id,
        role: "admin",
        status: "blocked",
      }),
    );

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisation2Record.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .create(user1OrganisationUserPermissionsPayload);

    await expect(testFn({ pb: approvedOrgAdminUserPb })).rejects.toThrow();
    await expect(testFn({ pb: pendingOrgAdminUserPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedOrgAdminUserPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionsPayload,
    );
  });
  it("PDBP-OUP-CREATE-AS-NON-MEMBER-02 — Organisation Standard (approved, pending, or blocked) cannot CREATE AS NON-MEMBER", async () => {
    const superadminAndOrgAdminPb = createPbConnection();
    const superadminAndOrgAdminUserPayload = userPayloadBuilder.forCreateRandomData();
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .create(superadminAndOrgAdminUserPayload);
    await superadminAndOrgAdminPb
      .collection(usersCollectionName)
      .authWithPassword(
        superadminAndOrgAdminUserPayload.email,
        superadminAndOrgAdminUserPayload.password,
      );

    const organisation1Record = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation2Record = await superadminAndOrgAdminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const approvedOrgStandardUserPb = createPbConnection();
    const approvedOrgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const approvedOrgStandardUserRecord = await approvedOrgStandardUserPb
      .collection(usersCollectionName)
      .create(approvedOrgStandardUserPayload);
    await approvedOrgStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(
        approvedOrgStandardUserPayload.email,
        approvedOrgStandardUserPayload.password,
      );

    await superadminAndOrgAdminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisation1Record.id,
        userId: approvedOrgStandardUserRecord.id,
        role: "standard",
        status: "approved",
      }),
    );

    const pendingOrgStandardUserPb = createPbConnection();
    const pendingOrgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const pendingOrgStandardUserRecord = await pendingOrgStandardUserPb
      .collection(usersCollectionName)
      .create(pendingOrgStandardUserPayload);
    await pendingOrgStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(
        pendingOrgStandardUserPayload.email,
        pendingOrgStandardUserPayload.password,
      );

    await superadminAndOrgAdminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisation1Record.id,
        userId: pendingOrgStandardUserRecord.id,
        role: "standard",
        status: "pending",
      }),
    );

    const blockedOrgStandardUserPb = createPbConnection();
    const blockedOrgStandardUserPayload = userPayloadBuilder.forCreateRandomData();
    const blockedOrgStandardUserRecord = await blockedOrgStandardUserPb
      .collection(usersCollectionName)
      .create(blockedOrgStandardUserPayload);
    await blockedOrgStandardUserPb
      .collection(usersCollectionName)
      .authWithPassword(
        blockedOrgStandardUserPayload.email,
        blockedOrgStandardUserPayload.password,
      );

    await superadminAndOrgAdminPb.collection(organisationUserPermissionsCollectionName).create(
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisation1Record.id,
        userId: blockedOrgStandardUserRecord.id,
        role: "standard",
        status: "blocked",
      }),
    );

    const user1Pb = createPbConnection();
    const user1UserPayload = userPayloadBuilder.forCreateRandomData();
    const user1Record = await user1Pb.collection(usersCollectionName).create(user1UserPayload);
    const user1OrganisationUserPermissionsPayload =
      organisationUserPermissionsPayloadBuilder.forCreateData({
        orgId: organisation2Record.id,
        userId: user1Record.id,
        role: "admin",
        status: "approved",
      });

    const testFn = (p: { pb: PocketBase }) =>
      p.pb
        .collection(organisationUserPermissionsCollectionName)
        .create(user1OrganisationUserPermissionsPayload);

    await expect(testFn({ pb: approvedOrgStandardUserPb })).rejects.toThrow();
    await expect(testFn({ pb: pendingOrgStandardUserPb })).rejects.toThrow();
    await expect(testFn({ pb: blockedOrgStandardUserPb })).rejects.toThrow();
    await expect(testFn({ pb: superadminAndOrgAdminPb })).resolves.toMatchObject(
      user1OrganisationUserPermissionsPayload,
    );
  });
});
