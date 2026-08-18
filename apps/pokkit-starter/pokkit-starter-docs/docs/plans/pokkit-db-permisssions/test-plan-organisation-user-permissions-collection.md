# Organisation User Permissions collection test plan

## Scope

This plan covers required tests for the Pokkit Db Permissions plugin.

Each test is given a tag in order to track the tests more easily:

- Global role tests: `PDBP-OUP-{ACTION}-{NN}`
- Organisation role tests: `PDBP-OUP-{ACTION}-AS-MEMBER-{NN}`, `PDBP-OUP-{ACTION}-AS-NON-MEMBER-{NN}`, `PDBP-OUP-{ACTION}-OWN-{NN}`
- Identity lock tests: `PDBP-OUP-IDENTITY-LOCK-{ACTION}-{NN}`, `PDBP-OUP-IDENTITY-LOCK-{ACTION}-AS-MEMBER-{NN}`

A ❌ in the spec still requires a test. It means the action must not succeed. Statuses that share the same outcome may be grouped (`pending or blocked`, or `approved, pending, or blocked`); the grouping must appear in the test title.

Organisation role tests use these meanings:

- **As Member**: the actor has an `organisationUserPermissions` record for the same organisation as the target record, and the target is not the actor's own record
- **As Non-Member**: the actor is not a member of the target organisation (including when they are a member of a different organisation)
- **Own**: the target is the actor's own `organisationUserPermissions` record
- **Identity lock**: even when UPDATE is allowed, `userId` and `orgId` must not change (the membership cannot be rebound to a different user or organisation)

Create Own is N/A in the spec (users are not expected to create their own membership record) and has no tests.

---

## Organisation User Permissions collection setup tests

### PDBP-OUP-SETUP-01 — Verify collection presence and validity is setup correctly

Checks that the default `organisationUserPermissions` collection from the database after plugin initialization is present and set up correctly.

## CREATE tests

### PDBP-OUP-CREATE-01 — Global Superadmin (approved) can CREATE

Checks that a user with global user permissions role `superadmin` and status `approved` can CREATE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-CREATE-02 — Global Superadmin (pending or blocked) cannot CREATE

Checks that a user with global user permissions role `superadmin` and status `pending` or `blocked` cannot CREATE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-CREATE-03 — Global Admin (approved, pending, or blocked) cannot CREATE

Checks that a user with global user permissions role `admin` and status `approved`, `pending`, or `blocked` cannot CREATE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-CREATE-04 — Global Standard (approved, pending, or blocked) cannot CREATE

Checks that a user with global user permissions role `standard` and status `approved`, `pending`, or `blocked` cannot CREATE a record in the `organisationUserPermissions` collection.

## CREATE AS MEMBER tests

### PDBP-OUP-CREATE-AS-MEMBER-01 — Organisation Admin (approved) can CREATE AS MEMBER

Checks that a user with organisation role `admin` and status `approved` can CREATE a record in the `organisationUserPermissions` collection for another user in an organisation they are a member of.

### PDBP-OUP-CREATE-AS-MEMBER-02 — Organisation Admin (pending or blocked) cannot CREATE AS MEMBER

Checks that a user with organisation role `admin` and status `pending` or `blocked` cannot CREATE a record in the `organisationUserPermissions` collection for another user in an organisation they are a member of.

### PDBP-OUP-CREATE-AS-MEMBER-03 — Organisation Standard (approved, pending, or blocked) cannot CREATE AS MEMBER

Checks that a user with organisation role `standard` and status `approved`, `pending`, or `blocked` cannot CREATE a record in the `organisationUserPermissions` collection for another user in an organisation they are a member of.

## CREATE AS NON-MEMBER tests

### PDBP-OUP-CREATE-AS-NON-MEMBER-01 — Organisation Admin (approved, pending, or blocked) cannot CREATE AS NON-MEMBER

Checks that a user with organisation role `admin` and status `approved`, `pending`, or `blocked` cannot CREATE a record in the `organisationUserPermissions` collection for an organisation they are not a member of.

### PDBP-OUP-CREATE-AS-NON-MEMBER-02 — Organisation Standard (approved, pending, or blocked) cannot CREATE AS NON-MEMBER

Checks that a user with organisation role `standard` and status `approved`, `pending`, or `blocked` cannot CREATE a record in the `organisationUserPermissions` collection for an organisation they are not a member of.

## VIEW tests

### PDBP-OUP-VIEW-01 — Global Superadmin (approved) can VIEW

Checks that a user with global user permissions role `superadmin` and status `approved` can VIEW a record in the `organisationUserPermissions` collection.

### PDBP-OUP-VIEW-02 — Global Superadmin (pending or blocked) cannot VIEW

Checks that a user with global user permissions role `superadmin` and status `pending` or `blocked` cannot VIEW a record in the `organisationUserPermissions` collection.

### PDBP-OUP-VIEW-03 — Global Admin (approved) can VIEW

Checks that a user with global user permissions role `admin` and status `approved` can VIEW a record in the `organisationUserPermissions` collection.

### PDBP-OUP-VIEW-04 — Global Admin (pending or blocked) cannot VIEW

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot VIEW a record in the `organisationUserPermissions` collection.

### PDBP-OUP-VIEW-05 — Global Standard (approved) can VIEW

Checks that a user with global user permissions role `standard` and status `approved` can VIEW a record in the `organisationUserPermissions` collection.

### PDBP-OUP-VIEW-06 — Global Standard (pending or blocked) cannot VIEW

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot VIEW a record in the `organisationUserPermissions` collection.

## VIEW AS MEMBER tests

### PDBP-OUP-VIEW-AS-MEMBER-01 — Organisation Admin (approved) can VIEW AS MEMBER

Checks that a user with organisation role `admin` and status `approved` can VIEW another member's record in the `organisationUserPermissions` collection for an organisation they are a member of.

### PDBP-OUP-VIEW-AS-MEMBER-02 — Organisation Admin (pending or blocked) cannot VIEW AS MEMBER

Checks that a user with organisation role `admin` and status `pending` or `blocked` cannot VIEW another member's record in the `organisationUserPermissions` collection for an organisation they are a member of.

### PDBP-OUP-VIEW-AS-MEMBER-03 — Organisation Standard (approved) can VIEW AS MEMBER

Checks that a user with organisation role `standard` and status `approved` can VIEW another member's record in the `organisationUserPermissions` collection for an organisation they are a member of.

### PDBP-OUP-VIEW-AS-MEMBER-04 — Organisation Standard (pending or blocked) cannot VIEW AS MEMBER

Checks that a user with organisation role `standard` and status `pending` or `blocked` cannot VIEW another member's record in the `organisationUserPermissions` collection for an organisation they are a member of.

## VIEW AS NON-MEMBER tests

### PDBP-OUP-VIEW-AS-NON-MEMBER-01 — Organisation Admin (approved, pending, or blocked) cannot VIEW AS NON-MEMBER

Checks that a user with organisation role `admin` and status `approved`, `pending`, or `blocked` cannot VIEW a record in the `organisationUserPermissions` collection for an organisation they are not a member of.

### PDBP-OUP-VIEW-AS-NON-MEMBER-02 — Organisation Standard (approved, pending, or blocked) cannot VIEW AS NON-MEMBER

Checks that a user with organisation role `standard` and status `approved`, `pending`, or `blocked` cannot VIEW a record in the `organisationUserPermissions` collection for an organisation they are not a member of.

## VIEW OWN tests

### PDBP-OUP-VIEW-OWN-01 — Organisation Admin (approved, pending, or blocked) can VIEW OWN

Checks that a user with organisation role `admin` and status `approved`, `pending`, or `blocked` can VIEW their own record in the `organisationUserPermissions` collection.

### PDBP-OUP-VIEW-OWN-02 — Organisation Standard (approved, pending, or blocked) can VIEW OWN

Checks that a user with organisation role `standard` and status `approved`, `pending`, or `blocked` can VIEW their own record in the `organisationUserPermissions` collection.

## LIST tests

### PDBP-OUP-LIST-01 — Global Superadmin (approved) can LIST

Checks that a user with global user permissions role `superadmin` and status `approved` can LIST records in the `organisationUserPermissions` collection.

### PDBP-OUP-LIST-02 — Global Superadmin (pending or blocked) cannot LIST

Checks that a user with global user permissions role `superadmin` and status `pending` or `blocked` cannot LIST records in the `organisationUserPermissions` collection.

### PDBP-OUP-LIST-03 — Global Admin (approved) can LIST

Checks that a user with global user permissions role `admin` and status `approved` can LIST records in the `organisationUserPermissions` collection.

### PDBP-OUP-LIST-04 — Global Admin (pending or blocked) cannot LIST

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot LIST records in the `organisationUserPermissions` collection.

### PDBP-OUP-LIST-05 — Global Standard (approved) can LIST

Checks that a user with global user permissions role `standard` and status `approved` can LIST records in the `organisationUserPermissions` collection.

### PDBP-OUP-LIST-06 — Global Standard (pending or blocked) cannot LIST

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot LIST records in the `organisationUserPermissions` collection.

## LIST AS MEMBER tests

### PDBP-OUP-LIST-AS-MEMBER-01 — Organisation Admin (approved) can LIST AS MEMBER

Checks that a user with organisation role `admin` and status `approved` can LIST other members' records in the `organisationUserPermissions` collection for an organisation they are a member of.

### PDBP-OUP-LIST-AS-MEMBER-02 — Organisation Admin (pending or blocked) cannot LIST AS MEMBER

Checks that a user with organisation role `admin` and status `pending` or `blocked` cannot LIST other members' records in the `organisationUserPermissions` collection for an organisation they are a member of.

### PDBP-OUP-LIST-AS-MEMBER-03 — Organisation Standard (approved) can LIST AS MEMBER

Checks that a user with organisation role `standard` and status `approved` can LIST other members' records in the `organisationUserPermissions` collection for an organisation they are a member of.

### PDBP-OUP-LIST-AS-MEMBER-04 — Organisation Standard (pending or blocked) cannot LIST AS MEMBER

Checks that a user with organisation role `standard` and status `pending` or `blocked` cannot LIST other members' records in the `organisationUserPermissions` collection for an organisation they are a member of.

## LIST AS NON-MEMBER tests

### PDBP-OUP-LIST-AS-NON-MEMBER-01 — Organisation Admin (approved, pending, or blocked) cannot LIST AS NON-MEMBER

Checks that a user with organisation role `admin` and status `approved`, `pending`, or `blocked` cannot LIST records in the `organisationUserPermissions` collection for an organisation they are not a member of.

### PDBP-OUP-LIST-AS-NON-MEMBER-02 — Organisation Standard (approved, pending, or blocked) cannot LIST AS NON-MEMBER

Checks that a user with organisation role `standard` and status `approved`, `pending`, or `blocked` cannot LIST records in the `organisationUserPermissions` collection for an organisation they are not a member of.

## LIST OWN tests

### PDBP-OUP-LIST-OWN-01 — Organisation Admin (approved, pending, or blocked) can LIST OWN

Checks that a user with organisation role `admin` and status `approved`, `pending`, or `blocked` can LIST their own record in the `organisationUserPermissions` collection.

### PDBP-OUP-LIST-OWN-02 — Organisation Standard (approved, pending, or blocked) can LIST OWN

Checks that a user with organisation role `standard` and status `approved`, `pending`, or `blocked` can LIST their own record in the `organisationUserPermissions` collection.

## UPDATE tests

### PDBP-OUP-UPDATE-01 — Global Superadmin (approved) can UPDATE

Checks that a user with global user permissions role `superadmin` and status `approved` can UPDATE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-UPDATE-02 — Global Superadmin (pending or blocked) cannot UPDATE

Checks that a user with global user permissions role `superadmin` and status `pending` or `blocked` cannot UPDATE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-UPDATE-03 — Global Admin (approved, pending, or blocked) cannot UPDATE

Checks that a user with global user permissions role `admin` and status `approved`, `pending`, or `blocked` cannot UPDATE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-UPDATE-04 — Global Standard (approved, pending, or blocked) cannot UPDATE

Checks that a user with global user permissions role `standard` and status `approved`, `pending`, or `blocked` cannot UPDATE a record in the `organisationUserPermissions` collection.

## UPDATE AS MEMBER tests

### PDBP-OUP-UPDATE-AS-MEMBER-01 — Organisation Admin (approved) can UPDATE AS MEMBER

Checks that a user with organisation role `admin` and status `approved` can UPDATE another member's record in the `organisationUserPermissions` collection for an organisation they are a member of.

### PDBP-OUP-UPDATE-AS-MEMBER-02 — Organisation Admin (pending or blocked) cannot UPDATE AS MEMBER

Checks that a user with organisation role `admin` and status `pending` or `blocked` cannot UPDATE another member's record in the `organisationUserPermissions` collection for an organisation they are a member of.

### PDBP-OUP-UPDATE-AS-MEMBER-03 — Organisation Standard (approved, pending, or blocked) cannot UPDATE AS MEMBER

Checks that a user with organisation role `standard` and status `approved`, `pending`, or `blocked` cannot UPDATE another member's record in the `organisationUserPermissions` collection for an organisation they are a member of.

## UPDATE AS NON-MEMBER tests

### PDBP-OUP-UPDATE-AS-NON-MEMBER-01 — Organisation Admin (approved, pending, or blocked) cannot UPDATE AS NON-MEMBER

Checks that a user with organisation role `admin` and status `approved`, `pending`, or `blocked` cannot UPDATE a record in the `organisationUserPermissions` collection for an organisation they are not a member of.

### PDBP-OUP-UPDATE-AS-NON-MEMBER-02 — Organisation Standard (approved, pending, or blocked) cannot UPDATE AS NON-MEMBER

Checks that a user with organisation role `standard` and status `approved`, `pending`, or `blocked` cannot UPDATE a record in the `organisationUserPermissions` collection for an organisation they are not a member of.

## UPDATE OWN tests

### PDBP-OUP-UPDATE-OWN-01 — Organisation Admin (approved, pending, or blocked) cannot UPDATE OWN

Checks that a user with organisation role `admin` and status `approved`, `pending`, or `blocked` cannot UPDATE their own record in the `organisationUserPermissions` collection.

### PDBP-OUP-UPDATE-OWN-02 — Organisation Standard (approved, pending, or blocked) cannot UPDATE OWN

Checks that a user with organisation role `standard` and status `approved`, `pending`, or `blocked` cannot UPDATE their own record in the `organisationUserPermissions` collection.

## Identity lock tests

### PDBP-OUP-IDENTITY-LOCK-UPDATE-01 — Global Superadmin (approved) cannot change userId on UPDATE

Checks that a user with global user permissions role `superadmin` and status `approved` cannot change `userId` when updating a record in the `organisationUserPermissions` collection.

### PDBP-OUP-IDENTITY-LOCK-UPDATE-02 — Global Superadmin (approved) cannot change orgId on UPDATE

Checks that a user with global user permissions role `superadmin` and status `approved` cannot change `orgId` when updating a record in the `organisationUserPermissions` collection.

### PDBP-OUP-IDENTITY-LOCK-UPDATE-AS-MEMBER-01 — Organisation Admin (approved) cannot change userId on UPDATE AS MEMBER

Checks that a user with organisation role `admin` and status `approved` cannot change `userId` when updating another member's record in the `organisationUserPermissions` collection for an organisation they are a member of.

### PDBP-OUP-IDENTITY-LOCK-UPDATE-AS-MEMBER-02 — Organisation Admin (approved) cannot change orgId on UPDATE AS MEMBER

Checks that a user with organisation role `admin` and status `approved` cannot change `orgId` when updating another member's record in the `organisationUserPermissions` collection for an organisation they are a member of.

## DELETE tests

### PDBP-OUP-DELETE-01 — Global Superadmin (approved) can DELETE

Checks that a user with global user permissions role `superadmin` and status `approved` can DELETE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-DELETE-02 — Global Superadmin (pending or blocked) cannot DELETE

Checks that a user with global user permissions role `superadmin` and status `pending` or `blocked` cannot DELETE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-DELETE-03 — Global Admin (approved, pending, or blocked) cannot DELETE

Checks that a user with global user permissions role `admin` and status `approved`, `pending`, or `blocked` cannot DELETE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-DELETE-04 — Global Standard (approved, pending, or blocked) cannot DELETE

Checks that a user with global user permissions role `standard` and status `approved`, `pending`, or `blocked` cannot DELETE a record in the `organisationUserPermissions` collection.

## DELETE AS MEMBER tests

### PDBP-OUP-DELETE-AS-MEMBER-01 — Organisation Admin (approved) can DELETE AS MEMBER

Checks that a user with organisation role `admin` and status `approved` can DELETE another member's record in the `organisationUserPermissions` collection for an organisation they are a member of.

### PDBP-OUP-DELETE-AS-MEMBER-02 — Organisation Admin (pending or blocked) cannot DELETE AS MEMBER

Checks that a user with organisation role `admin` and status `pending` or `blocked` cannot DELETE another member's record in the `organisationUserPermissions` collection for an organisation they are a member of.

### PDBP-OUP-DELETE-AS-MEMBER-03 — Organisation Standard (approved, pending, or blocked) cannot DELETE AS MEMBER

Checks that a user with organisation role `standard` and status `approved`, `pending`, or `blocked` cannot DELETE another member's record in the `organisationUserPermissions` collection for an organisation they are a member of.

## DELETE AS NON-MEMBER tests

### PDBP-OUP-DELETE-AS-NON-MEMBER-01 — Organisation Admin (approved, pending, or blocked) cannot DELETE AS NON-MEMBER

Checks that a user with organisation role `admin` and status `approved`, `pending`, or `blocked` cannot DELETE a record in the `organisationUserPermissions` collection for an organisation they are not a member of.

### PDBP-OUP-DELETE-AS-NON-MEMBER-02 — Organisation Standard (approved, pending, or blocked) cannot DELETE AS NON-MEMBER

Checks that a user with organisation role `standard` and status `approved`, `pending`, or `blocked` cannot DELETE a record in the `organisationUserPermissions` collection for an organisation they are not a member of.

## DELETE OWN tests

### PDBP-OUP-DELETE-OWN-01 — Organisation Admin (approved, pending, or blocked) cannot DELETE OWN

Checks that a user with organisation role `admin` and status `approved`, `pending`, or `blocked` cannot DELETE their own record in the `organisationUserPermissions` collection.

### PDBP-OUP-DELETE-OWN-02 — Organisation Standard (approved, pending, or blocked) cannot DELETE OWN

Checks that a user with organisation role `standard` and status `approved`, `pending`, or `blocked` cannot DELETE their own record in the `organisationUserPermissions` collection.
