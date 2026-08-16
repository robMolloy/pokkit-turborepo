import { describe, it } from "vitest";

describe("pokkitDbPermissionsOrganisationUserPermissionsCollection test names", () => {
  it("PDBP-OUP-SETUP-01 — Verify collection presence and validity is setup correctly", async () => {});

  it("PDBP-OUP-CREATE-01 — Global Superadmin (approved) can CREATE", async () => {});
  it("PDBP-OUP-CREATE-02 — Global Superadmin (pending or blocked) cannot CREATE", async () => {});
  it("PDBP-OUP-CREATE-03 — Global Admin cannot CREATE", async () => {});
  it("PDBP-OUP-CREATE-04 — Global Standard cannot CREATE", async () => {});

  it("PDBP-OUP-CREATE-OWN-01 — Global Superadmin cannot CREATE OWN", async () => {});
  it("PDBP-OUP-CREATE-OWN-02 — Global Admin cannot CREATE OWN", async () => {});
  it("PDBP-OUP-CREATE-OWN-03 — Global Standard cannot CREATE OWN", async () => {});

  it("PDBP-OUP-VIEW-01 — Global Superadmin (approved) can VIEW", async () => {});
  it("PDBP-OUP-VIEW-02 — Global Superadmin (pending or blocked) cannot VIEW", async () => {});
  it("PDBP-OUP-VIEW-03 — Global Admin (approved) can VIEW", async () => {});
  it("PDBP-OUP-VIEW-04 — Global Admin (pending or blocked) cannot VIEW", async () => {});
  it("PDBP-OUP-VIEW-05 — Global Standard (approved) can VIEW", async () => {});
  it("PDBP-OUP-VIEW-06 — Global Standard (pending or blocked) cannot VIEW", async () => {});
  it("PDBP-OUP-VIEW-07 — Organisation Admin (approved) can VIEW", async () => {});
  it("PDBP-OUP-VIEW-08 — Organisation Admin (pending or blocked) cannot VIEW", async () => {});
  it("PDBP-OUP-VIEW-09 — Organisation Standard (approved) can VIEW", async () => {});
  it("PDBP-OUP-VIEW-10 — Organisation Standard (pending or blocked) cannot VIEW", async () => {});

  it("PDBP-OUP-VIEW-OWN-01 — Global Superadmin can VIEW OWN", async () => {});
  it("PDBP-OUP-VIEW-OWN-02 — Global Admin can VIEW OWN", async () => {});
  it("PDBP-OUP-VIEW-OWN-03 — Global Standard can VIEW OWN", async () => {});
  it("PDBP-OUP-VIEW-OWN-04 — Organisation Admin can VIEW OWN", async () => {});
  it("PDBP-OUP-VIEW-OWN-05 — Organisation Standard can VIEW OWN", async () => {});

  it("PDBP-OUP-LIST-01 — Global Superadmin (approved) can LIST", async () => {});
  it("PDBP-OUP-LIST-02 — Global Superadmin (pending or blocked) cannot LIST", async () => {});
  it("PDBP-OUP-LIST-03 — Global Admin (approved) can LIST", async () => {});
  it("PDBP-OUP-LIST-04 — Global Admin (pending or blocked) cannot LIST", async () => {});
  it("PDBP-OUP-LIST-05 — Global Standard (approved) can LIST", async () => {});
  it("PDBP-OUP-LIST-06 — Global Standard (pending or blocked) cannot LIST", async () => {});
  it("PDBP-OUP-LIST-07 — Organisation Admin (approved) can LIST", async () => {});
  it("PDBP-OUP-LIST-08 — Organisation Admin (pending or blocked) cannot LIST", async () => {});
  it("PDBP-OUP-LIST-09 — Organisation Standard (approved) can LIST", async () => {});
  it("PDBP-OUP-LIST-10 — Organisation Standard (pending or blocked) cannot LIST", async () => {});

  it("PDBP-OUP-LIST-OWN-01 — Global Superadmin can LIST OWN", async () => {});
  it("PDBP-OUP-LIST-OWN-02 — Global Admin can LIST OWN", async () => {});
  it("PDBP-OUP-LIST-OWN-03 — Global Standard can LIST OWN", async () => {});
  it("PDBP-OUP-LIST-OWN-04 — Organisation Admin can LIST OWN", async () => {});
  it("PDBP-OUP-LIST-OWN-05 — Organisation Standard can LIST OWN", async () => {});

  it("PDBP-OUP-UPDATE-01 — Global Superadmin (approved) can UPDATE", async () => {});
  it("PDBP-OUP-UPDATE-02 — Global Superadmin (pending or blocked) cannot UPDATE", async () => {});
  it("PDBP-OUP-UPDATE-03 — Global Admin cannot UPDATE", async () => {});
  it("PDBP-OUP-UPDATE-04 — Global Standard cannot UPDATE", async () => {});
  it("PDBP-OUP-UPDATE-05 — Organisation Admin (approved) can UPDATE", async () => {});
  it("PDBP-OUP-UPDATE-06 — Organisation Admin (pending or blocked) cannot UPDATE", async () => {});
  it("PDBP-OUP-UPDATE-07 — Organisation Standard cannot UPDATE", async () => {});

  it("PDBP-OUP-UPDATE-OWN-01 — Global Superadmin cannot UPDATE OWN", async () => {});
  it("PDBP-OUP-UPDATE-OWN-02 — Global Admin cannot UPDATE OWN", async () => {});
  it("PDBP-OUP-UPDATE-OWN-03 — Global Standard cannot UPDATE OWN", async () => {});
  it("PDBP-OUP-UPDATE-OWN-04 — Organisation Admin cannot UPDATE OWN", async () => {});
  it("PDBP-OUP-UPDATE-OWN-05 — Organisation Standard cannot UPDATE OWN", async () => {});

  it("PDBP-OUP-DELETE-01 — Global Superadmin (approved) can DELETE", async () => {});
  it("PDBP-OUP-DELETE-02 — Global Superadmin (pending or blocked) cannot DELETE", async () => {});
  it("PDBP-OUP-DELETE-03 — Global Admin cannot DELETE", async () => {});
  it("PDBP-OUP-DELETE-04 — Global Standard cannot DELETE", async () => {});
  it("PDBP-OUP-DELETE-05 — Organisation Admin (approved) can DELETE", async () => {});
  it("PDBP-OUP-DELETE-06 — Organisation Admin (pending or blocked) cannot DELETE", async () => {});
  it("PDBP-OUP-DELETE-07 — Organisation Standard cannot DELETE", async () => {});

  it("PDBP-OUP-DELETE-OWN-01 — Global Superadmin cannot DELETE OWN", async () => {});
  it("PDBP-OUP-DELETE-OWN-02 — Global Admin cannot DELETE OWN", async () => {});
  it("PDBP-OUP-DELETE-OWN-03 — Global Standard cannot DELETE OWN", async () => {});
  it("PDBP-OUP-DELETE-OWN-04 — Organisation Admin cannot DELETE OWN", async () => {});
  it("PDBP-OUP-DELETE-OWN-05 — Organisation Standard cannot DELETE OWN", async () => {});
});
