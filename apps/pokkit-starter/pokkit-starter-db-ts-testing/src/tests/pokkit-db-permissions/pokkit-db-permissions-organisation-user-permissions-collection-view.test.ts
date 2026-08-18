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
import {
  createUserAndPermissions,
  organisationsCollectionName,
  organisationsPayloadBuilder,
  organisationUserPermissionsCollectionName,
  organisationUserPermissionsPayloadBuilder,
  userPayloadBuilder,
} from "@repo/pokkit-db-permissions-ts-helpers";

const testMetadata =
  pokkitDbPermissionsTestsMetadata.pokkitDbPermissionsOrganisationUserPermissionsCollectionView;
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

  it("PDBP-OUP-VIEW-01 — Global Superadmin (approved) can VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const organisationUserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFirstListItem("");

    if (!organisationUserPermissionRecord)
      return expect(organisationUserPermissionRecord).toBeTruthy();

    const superadmin2Pb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadmin2Pb, payload: userPayloadBuilder.forCreateRandomData() },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "superadmin", status: "approved" },
      },
    });

    const testOrganisationUserPermissionRecord = await superadmin2Pb
      .collection(organisationUserPermissionsCollectionName)
      .getOne(organisationUserPermissionRecord.id);

    expect(testOrganisationUserPermissionRecord).toMatchObject(organisationUserPermissionRecord);
  });

  it("PDBP-OUP-VIEW-02 — Global Superadmin (pending or blocked) cannot VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const organisationUserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFirstListItem("");

    if (!organisationUserPermissionRecord)
      return expect(organisationUserPermissionRecord).toBeTruthy();

    const pendingSuperadminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingSuperadminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "superadmin", status: "pending" },
      },
    });

    await expect(
      pendingSuperadminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(organisationUserPermissionRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-VIEW-03 — Global Admin (approved) can VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const organisationUserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFirstListItem("");

    if (!organisationUserPermissionRecord)
      return expect(organisationUserPermissionRecord).toBeTruthy();

    const approvedAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "admin", status: "approved" },
      },
    });

    const testOrganisationUserPermissionRecord = await approvedAdminPb
      .collection(organisationUserPermissionsCollectionName)
      .getOne(organisationUserPermissionRecord.id);

    expect(testOrganisationUserPermissionRecord).toMatchObject(organisationUserPermissionRecord);
  });

  it("PDBP-OUP-VIEW-04 — Global Admin (pending or blocked) cannot VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const organisationUserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFirstListItem("");

    if (!organisationUserPermissionRecord)
      return expect(organisationUserPermissionRecord).toBeTruthy();

    const pendingAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "admin", status: "pending" },
      },
    });

    const blockedAdminPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "admin", status: "blocked" },
      },
    });

    await expect(
      pendingAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(organisationUserPermissionRecord.id),
    ).rejects.toThrow();

    await expect(
      blockedAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(organisationUserPermissionRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-VIEW-05 — Global Standard (approved) can VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const organisationUserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFirstListItem("");

    if (!organisationUserPermissionRecord)
      return expect(organisationUserPermissionRecord).toBeTruthy();

    const approvedStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "standard", status: "approved" },
      },
    });

    const testOrganisationUserPermissionRecord = await approvedStandardPb
      .collection(organisationUserPermissionsCollectionName)
      .getOne(organisationUserPermissionRecord.id);

    expect(testOrganisationUserPermissionRecord).toMatchObject(organisationUserPermissionRecord);
  });

  it("PDBP-OUP-VIEW-06 — Global Standard (pending or blocked) cannot VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const organisationUserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFirstListItem("");

    if (!organisationUserPermissionRecord)
      return expect(organisationUserPermissionRecord).toBeTruthy();

    const pendingStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "standard", status: "pending" },
      },
    });

    const blockedStandardPb = createPbConnection();
    await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      globalUserPermissions: {
        toBeActionedByPb: superadminPb,
        payload: { role: "standard", status: "blocked" },
      },
    });

    await expect(
      pendingStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(organisationUserPermissionRecord.id),
    ).rejects.toThrow();

    await expect(
      blockedStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(organisationUserPermissionRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-VIEW-07 — Organisation Admin (approved) can VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisation1Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation2Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation3Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const organisationUserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFirstListItem("");

    if (!organisationUserPermissionRecord)
      return expect(organisationUserPermissionRecord).toBeTruthy();

    const approvedOrg1and2AdminPb = createPbConnection();
    const { userRecord: approvedOrg1and2AdminUserRecord } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedOrg1and2AdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
    });
    const approvedOrg1and2AdminOrg1UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation1Record.id,
          userId: approvedOrg1and2AdminUserRecord.id,
          role: "admin",
          status: "approved",
        }),
      );
    const approvedOrg1and2AdminOrg2UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation2Record.id,
          userId: approvedOrg1and2AdminUserRecord.id,
          role: "admin",
          status: "approved",
        }),
      );

    const approvedOrg2and3AdminPb = createPbConnection();
    const { userRecord: approvedOrg2and3AdminUserRecord } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedOrg2and3AdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
    });
    const approvedOrg2and3AdminOrg2UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation2Record.id,
          userId: approvedOrg2and3AdminUserRecord.id,
          role: "admin",
          status: "approved",
        }),
      );
    const approvedOrg2and3AdminOrg3UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation3Record.id,
          userId: approvedOrg2and3AdminUserRecord.id,
          role: "admin",
          status: "approved",
        }),
      );

    await expect(
      approvedOrg1and2AdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrg1and2AdminOrg1UserPermissionRecord.id),
    ).resolves.toMatchObject(approvedOrg1and2AdminOrg1UserPermissionRecord);

    await expect(
      approvedOrg1and2AdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrg1and2AdminOrg2UserPermissionRecord.id),
    ).resolves.toMatchObject(approvedOrg1and2AdminOrg2UserPermissionRecord);

    await expect(
      approvedOrg1and2AdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrg2and3AdminOrg2UserPermissionRecord.id),
    ).resolves.toMatchObject(approvedOrg2and3AdminOrg2UserPermissionRecord);

    await expect(
      approvedOrg1and2AdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrg2and3AdminOrg3UserPermissionRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-VIEW-08 — Organisation Admin (pending or blocked) cannot VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisation1Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation2Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation3Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const organisationUserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFirstListItem("");

    if (!organisationUserPermissionRecord)
      return expect(organisationUserPermissionRecord).toBeTruthy();

    const pendingOrg1and2AdminPb = createPbConnection();
    const { userRecord: pendingOrg1and2AdminUserRecord } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingOrg1and2AdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
    });
    const pendingOrg1and2AdminOrg1UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation1Record.id,
          userId: pendingOrg1and2AdminUserRecord.id,
          role: "admin",
          status: "pending",
        }),
      );
    const pendingOrg1and2AdminOrg2UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation2Record.id,
          userId: pendingOrg1and2AdminUserRecord.id,
          role: "admin",
          status: "pending",
        }),
      );

    const pendingOrg2and3AdminPb = createPbConnection();
    const { userRecord: pendingOrg2and3AdminUserRecord } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingOrg2and3AdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
    });
    const pendingOrg2and3AdminOrg2UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation2Record.id,
          userId: pendingOrg2and3AdminUserRecord.id,
          role: "admin",
          status: "pending",
        }),
      );
    const pendingOrg2and3AdminOrg3UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation3Record.id,
          userId: pendingOrg2and3AdminUserRecord.id,
          role: "admin",
          status: "pending",
        }),
      );

    await expect(
      pendingOrg1and2AdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrg1and2AdminOrg1UserPermissionRecord.id),
    ).resolves.toMatchObject(pendingOrg1and2AdminOrg1UserPermissionRecord);

    await expect(
      pendingOrg1and2AdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrg1and2AdminOrg2UserPermissionRecord.id),
    ).resolves.toMatchObject(pendingOrg1and2AdminOrg2UserPermissionRecord);

    await expect(
      pendingOrg1and2AdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrg2and3AdminOrg2UserPermissionRecord.id),
    ).rejects.toThrow();

    await expect(
      pendingOrg1and2AdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrg2and3AdminOrg3UserPermissionRecord.id),
    ).rejects.toThrow();

    const blockedOrg1and2AdminPb = createPbConnection();
    const { userRecord: blockedOrg1and2AdminUserRecord } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedOrg1and2AdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
    });
    const blockedOrg1and2AdminOrg1UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation1Record.id,
          userId: blockedOrg1and2AdminUserRecord.id,
          role: "admin",
          status: "blocked",
        }),
      );
    const blockedOrg1and2AdminOrg2UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation2Record.id,
          userId: blockedOrg1and2AdminUserRecord.id,
          role: "admin",
          status: "blocked",
        }),
      );

    const blockedOrg2and3AdminPb = createPbConnection();
    const { userRecord: blockedOrg2and3AdminUserRecord } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedOrg2and3AdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
    });
    const blockedOrg2and3AdminOrg2UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation2Record.id,
          userId: blockedOrg2and3AdminUserRecord.id,
          role: "admin",
          status: "blocked",
        }),
      );
    const blockedOrg2and3AdminOrg3UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation3Record.id,
          userId: blockedOrg2and3AdminUserRecord.id,
          role: "admin",
          status: "blocked",
        }),
      );

    await expect(
      blockedOrg1and2AdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrg1and2AdminOrg1UserPermissionRecord.id),
    ).resolves.toMatchObject(blockedOrg1and2AdminOrg1UserPermissionRecord);

    await expect(
      blockedOrg1and2AdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrg1and2AdminOrg2UserPermissionRecord.id),
    ).resolves.toMatchObject(blockedOrg1and2AdminOrg2UserPermissionRecord);

    await expect(
      blockedOrg1and2AdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrg2and3AdminOrg2UserPermissionRecord.id),
    ).rejects.toThrow();

    await expect(
      blockedOrg1and2AdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrg2and3AdminOrg3UserPermissionRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-VIEW-09 — Organisation Standard (approved) can VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisation1Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation2Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation3Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const organisationUserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFirstListItem("");

    if (!organisationUserPermissionRecord)
      return expect(organisationUserPermissionRecord).toBeTruthy();

    const approvedOrg1and2StandardPb = createPbConnection();
    const { userRecord: approvedOrg1and2StandardUserRecord } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedOrg1and2StandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
    });
    const approvedOrg1and2StandardOrg1UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation1Record.id,
          userId: approvedOrg1and2StandardUserRecord.id,
          role: "standard",
          status: "approved",
        }),
      );
    const approvedOrg1and2StandardOrg2UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation2Record.id,
          userId: approvedOrg1and2StandardUserRecord.id,
          role: "standard",
          status: "approved",
        }),
      );

    const approvedOrg2and3StandardPb = createPbConnection();
    const { userRecord: approvedOrg2and3StandardUserRecord } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedOrg2and3StandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
    });
    const approvedOrg2and3StandardOrg2UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation2Record.id,
          userId: approvedOrg2and3StandardUserRecord.id,
          role: "standard",
          status: "approved",
        }),
      );
    const approvedOrg2and3StandardOrg3UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation3Record.id,
          userId: approvedOrg2and3StandardUserRecord.id,
          role: "standard",
          status: "approved",
        }),
      );

    await expect(
      approvedOrg1and2StandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrg1and2StandardOrg1UserPermissionRecord.id),
    ).resolves.toMatchObject(approvedOrg1and2StandardOrg1UserPermissionRecord);

    await expect(
      approvedOrg1and2StandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrg1and2StandardOrg2UserPermissionRecord.id),
    ).resolves.toMatchObject(approvedOrg1and2StandardOrg2UserPermissionRecord);

    await expect(
      approvedOrg1and2StandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrg2and3StandardOrg2UserPermissionRecord.id),
    ).resolves.toMatchObject(approvedOrg2and3StandardOrg2UserPermissionRecord);

    await expect(
      approvedOrg1and2StandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrg2and3StandardOrg3UserPermissionRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-VIEW-10 — Organisation Standard (pending or blocked) cannot VIEW", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisation1Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation2Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation3Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const organisationUserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .getFirstListItem("");

    if (!organisationUserPermissionRecord)
      return expect(organisationUserPermissionRecord).toBeTruthy();

    const pendingOrg1and2StandardPb = createPbConnection();
    const { userRecord: pendingOrg1and2StandardUserRecord } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingOrg1and2StandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
    });
    const pendingOrg1and2StandardOrg1UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation1Record.id,
          userId: pendingOrg1and2StandardUserRecord.id,
          role: "standard",
          status: "pending",
        }),
      );
    const pendingOrg1and2StandardOrg2UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation2Record.id,
          userId: pendingOrg1and2StandardUserRecord.id,
          role: "standard",
          status: "pending",
        }),
      );

    const pendingOrg2and3StandardPb = createPbConnection();
    const { userRecord: pendingOrg2and3StandardUserRecord } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingOrg2and3StandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
    });
    const pendingOrg2and3StandardOrg2UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation2Record.id,
          userId: pendingOrg2and3StandardUserRecord.id,
          role: "standard",
          status: "pending",
        }),
      );
    const pendingOrg2and3StandardOrg3UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation3Record.id,
          userId: pendingOrg2and3StandardUserRecord.id,
          role: "standard",
          status: "pending",
        }),
      );

    await expect(
      pendingOrg1and2StandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrg1and2StandardOrg1UserPermissionRecord.id),
    ).resolves.toMatchObject(pendingOrg1and2StandardOrg1UserPermissionRecord);

    await expect(
      pendingOrg1and2StandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrg1and2StandardOrg2UserPermissionRecord.id),
    ).resolves.toMatchObject(pendingOrg1and2StandardOrg2UserPermissionRecord);

    await expect(
      pendingOrg1and2StandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrg2and3StandardOrg2UserPermissionRecord.id),
    ).rejects.toThrow();

    await expect(
      pendingOrg1and2StandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrg2and3StandardOrg3UserPermissionRecord.id),
    ).rejects.toThrow();

    const blockedOrg1and2StandardPb = createPbConnection();
    const { userRecord: blockedOrg1and2StandardUserRecord } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedOrg1and2StandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
    });
    const blockedOrg1and2StandardOrg1UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation1Record.id,
          userId: blockedOrg1and2StandardUserRecord.id,
          role: "standard",
          status: "blocked",
        }),
      );
    const blockedOrg1and2StandardOrg2UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation2Record.id,
          userId: blockedOrg1and2StandardUserRecord.id,
          role: "standard",
          status: "blocked",
        }),
      );

    const blockedOrg2and3StandardPb = createPbConnection();
    const { userRecord: blockedOrg2and3StandardUserRecord } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedOrg2and3StandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
    });
    const blockedOrg2and3StandardOrg2UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation2Record.id,
          userId: blockedOrg2and3StandardUserRecord.id,
          role: "standard",
          status: "blocked",
        }),
      );
    const blockedOrg2and3StandardOrg3UserPermissionRecord = await superadminPb
      .collection(organisationUserPermissionsCollectionName)
      .create(
        organisationUserPermissionsPayloadBuilder.forCreateData({
          orgId: organisation3Record.id,
          userId: blockedOrg2and3StandardUserRecord.id,
          role: "standard",
          status: "blocked",
        }),
      );

    await expect(
      blockedOrg1and2StandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrg1and2StandardOrg1UserPermissionRecord.id),
    ).resolves.toMatchObject(blockedOrg1and2StandardOrg1UserPermissionRecord);

    await expect(
      blockedOrg1and2StandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrg1and2StandardOrg2UserPermissionRecord.id),
    ).resolves.toMatchObject(blockedOrg1and2StandardOrg2UserPermissionRecord);

    await expect(
      blockedOrg1and2StandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrg2and3StandardOrg2UserPermissionRecord.id),
    ).rejects.toThrow();

    await expect(
      blockedOrg1and2StandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrg2and3StandardOrg3UserPermissionRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-VIEW-OWN-01 — Organisation Admin can VIEW OWN", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisation1Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation2Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation3Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const approvedOrgAdminPb = createPbConnection();
    const {
      organisationUserPermissionsRecords: [approvedOrgAdminUserPermissionRecord],
    } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedOrgAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation1Record.id, role: "admin", status: "approved" },
        },
      ],
    });
    if (!approvedOrgAdminUserPermissionRecord)
      return expect(approvedOrgAdminUserPermissionRecord).toBeTruthy();

    const pendingOrgAdminPb = createPbConnection();
    const {
      organisationUserPermissionsRecords: [pendingOrgAdminUserPermissionRecord],
    } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingOrgAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation2Record.id, role: "admin", status: "pending" },
        },
      ],
    });
    if (!pendingOrgAdminUserPermissionRecord)
      return expect(pendingOrgAdminUserPermissionRecord).toBeTruthy();

    const blockedOrgAdminPb = createPbConnection();
    const {
      organisationUserPermissionsRecords: [blockedOrgAdminUserPermissionRecord],
    } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedOrgAdminPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation3Record.id, role: "admin", status: "blocked" },
        },
      ],
    });
    if (!blockedOrgAdminUserPermissionRecord)
      return expect(blockedOrgAdminUserPermissionRecord).toBeTruthy();

    await expect(
      approvedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrgAdminUserPermissionRecord.id),
    ).resolves.toMatchObject(approvedOrgAdminUserPermissionRecord);
    await expect(
      approvedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrgAdminUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      approvedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrgAdminUserPermissionRecord.id),
    ).rejects.toThrow();

    await expect(
      pendingOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrgAdminUserPermissionRecord.id),
    ).resolves.toMatchObject(pendingOrgAdminUserPermissionRecord);
    await expect(
      pendingOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrgAdminUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      pendingOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrgAdminUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      blockedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrgAdminUserPermissionRecord.id),
    ).resolves.toMatchObject(blockedOrgAdminUserPermissionRecord);
    await expect(
      blockedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrgAdminUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      blockedOrgAdminPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrgAdminUserPermissionRecord.id),
    ).rejects.toThrow();
  });

  it("PDBP-OUP-VIEW-OWN-02 — Organisation Standard can VIEW OWN", async () => {
    const superadminPb = createPbConnection();
    await createUserAndPermissions({
      user: { toBeActionedByPb: superadminPb, payload: userPayloadBuilder.forCreateRandomData() },
    });

    const organisation1Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation2Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());
    const organisation3Record = await superadminPb
      .collection(organisationsCollectionName)
      .create(organisationsPayloadBuilder.forCreateRandomData());

    const approvedOrgStandardPb = createPbConnection();
    const {
      organisationUserPermissionsRecords: [approvedOrgStandardUserPermissionRecord],
    } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: approvedOrgStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation1Record.id, role: "standard", status: "approved" },
        },
      ],
    });
    if (!approvedOrgStandardUserPermissionRecord)
      return expect(approvedOrgStandardUserPermissionRecord).toBeTruthy();

    const pendingOrgStandardPb = createPbConnection();
    const {
      organisationUserPermissionsRecords: [pendingOrgStandardUserPermissionRecord],
    } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: pendingOrgStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation2Record.id, role: "standard", status: "pending" },
        },
      ],
    });
    if (!pendingOrgStandardUserPermissionRecord)
      return expect(pendingOrgStandardUserPermissionRecord).toBeTruthy();

    const blockedOrgStandardPb = createPbConnection();
    const {
      organisationUserPermissionsRecords: [blockedOrgStandardUserPermissionRecord],
    } = await createUserAndPermissions({
      user: {
        toBeActionedByPb: blockedOrgStandardPb,
        payload: userPayloadBuilder.forCreateRandomData(),
      },
      organisationUserPermissions: [
        {
          toBeActionedByPb: superadminPb,
          payload: { orgId: organisation3Record.id, role: "standard", status: "blocked" },
        },
      ],
    });
    if (!blockedOrgStandardUserPermissionRecord)
      return expect(blockedOrgStandardUserPermissionRecord).toBeTruthy();

    await expect(
      approvedOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrgStandardUserPermissionRecord.id),
    ).resolves.toMatchObject(approvedOrgStandardUserPermissionRecord);
    await expect(
      approvedOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrgStandardUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      approvedOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrgStandardUserPermissionRecord.id),
    ).rejects.toThrow();

    await expect(
      pendingOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrgStandardUserPermissionRecord.id),
    ).resolves.toMatchObject(pendingOrgStandardUserPermissionRecord);
    await expect(
      pendingOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrgStandardUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      pendingOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrgStandardUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      blockedOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(blockedOrgStandardUserPermissionRecord.id),
    ).resolves.toMatchObject(blockedOrgStandardUserPermissionRecord);
    await expect(
      blockedOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(approvedOrgStandardUserPermissionRecord.id),
    ).rejects.toThrow();
    await expect(
      blockedOrgStandardPb
        .collection(organisationUserPermissionsCollectionName)
        .getOne(pendingOrgStandardUserPermissionRecord.id),
    ).rejects.toThrow();
  });
});
