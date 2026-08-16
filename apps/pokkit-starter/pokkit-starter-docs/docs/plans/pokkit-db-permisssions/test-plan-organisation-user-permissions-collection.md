# Organisation User Permissions collection test plan

## Scope

This plan covers required tests for the Pokkit Db Permissions plugin:

Each test is given a tag in the following format. PDBP-{COLLECTION}-{ACTION}-{NN} In order to track the tests more easily.

Organisation role CREATE and CREATE OWN are N/A and are not tested. If the organisation does not exist, a user cannot be part of that organisation, so a CREATE action by a member of that organisation does not make sense.

---

## Organisation User Permissions collection setup tests

### PDBP-OUP-SETUP-01 — Verify collection presence and validity is setup correctly

Checks that the default `organisationUserPermissions` collection from the database after plugin initialization is present and set up correctly.

## Global role permissions tests

### PDBP-OUP-CREATE-01 — Global Superadmin (approved) can CREATE

Checks that a user with global user permissions role `superadmin` and status `approved` can CREATE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-CREATE-02 — Global Superadmin (pending or blocked) cannot CREATE

Checks that a user with global user permissions role `superadmin` and status `pending` or `blocked` cannot CREATE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-CREATE-03 — Global Admin cannot CREATE

Checks that a user with global user permissions role `admin` cannot CREATE a record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-CREATE-04 — Global Standard cannot CREATE

Checks that a user with global user permissions role `standard` cannot CREATE a record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-CREATE-OWN-01 — Global Superadmin cannot CREATE OWN

Checks that a user with global user permissions role `superadmin` cannot CREATE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-CREATE-OWN-02 — Global Admin cannot CREATE OWN

Checks that a user with global user permissions role `admin` cannot CREATE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-CREATE-OWN-03 — Global Standard cannot CREATE OWN

Checks that a user with global user permissions role `standard` cannot CREATE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

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

### PDBP-OUP-VIEW-OWN-01 — Global Superadmin can VIEW OWN

Checks that a user with global user permissions role `superadmin` can VIEW their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-VIEW-OWN-02 — Global Admin can VIEW OWN

Checks that a user with global user permissions role `admin` can VIEW their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-VIEW-OWN-03 — Global Standard can VIEW OWN

Checks that a user with global user permissions role `standard` can VIEW their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

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

### PDBP-OUP-LIST-OWN-01 — Global Superadmin can LIST OWN

Checks that a user with global user permissions role `superadmin` can LIST their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-LIST-OWN-02 — Global Admin can LIST OWN

Checks that a user with global user permissions role `admin` can LIST their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-LIST-OWN-03 — Global Standard can LIST OWN

Checks that a user with global user permissions role `standard` can LIST their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-UPDATE-01 — Global Superadmin (approved) can UPDATE

Checks that a user with global user permissions role `superadmin` and status `approved` can UPDATE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-UPDATE-02 — Global Superadmin (pending or blocked) cannot UPDATE

Checks that a user with global user permissions role `superadmin` and status `pending` or `blocked` cannot UPDATE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-UPDATE-03 — Global Admin cannot UPDATE

Checks that a user with global user permissions role `admin` cannot UPDATE a record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-UPDATE-04 — Global Standard cannot UPDATE

Checks that a user with global user permissions role `standard` cannot UPDATE a record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-UPDATE-OWN-01 — Global Superadmin cannot UPDATE OWN

Checks that a user with global user permissions role `superadmin` cannot UPDATE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-UPDATE-OWN-02 — Global Admin cannot UPDATE OWN

Checks that a user with global user permissions role `admin` cannot UPDATE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-UPDATE-OWN-03 — Global Standard cannot UPDATE OWN

Checks that a user with global user permissions role `standard` cannot UPDATE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-DELETE-01 — Global Superadmin (approved) can DELETE

Checks that a user with global user permissions role `superadmin` and status `approved` can DELETE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-DELETE-02 — Global Superadmin (pending or blocked) cannot DELETE

Checks that a user with global user permissions role `superadmin` and status `pending` or `blocked` cannot DELETE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-DELETE-03 — Global Admin cannot DELETE

Checks that a user with global user permissions role `admin` cannot DELETE a record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-DELETE-04 — Global Standard cannot DELETE

Checks that a user with global user permissions role `standard` cannot DELETE a record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-DELETE-OWN-01 — Global Superadmin cannot DELETE OWN

Checks that a user with global user permissions role `superadmin` cannot DELETE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-DELETE-OWN-02 — Global Admin cannot DELETE OWN

Checks that a user with global user permissions role `admin` cannot DELETE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-DELETE-OWN-03 — Global Standard cannot DELETE OWN

Checks that a user with global user permissions role `standard` cannot DELETE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

## Organisation role permissions tests

Organisation role CREATE and CREATE OWN are N/A and are not tested.

### PDBP-OUP-VIEW-07 — Organisation Admin (approved) can VIEW

Checks that a user with organisation role `admin` and status `approved` can VIEW a record in the `organisationUserPermissions` collection.

### PDBP-OUP-VIEW-08 — Organisation Admin (pending or blocked) cannot VIEW

Checks that a user with organisation role `admin` and status `pending` or `blocked` cannot VIEW a record in the `organisationUserPermissions` collection.

### PDBP-OUP-VIEW-09 — Organisation Standard (approved) can VIEW

Checks that a user with organisation role `standard` and status `approved` can VIEW a record in the `organisationUserPermissions` collection.

### PDBP-OUP-VIEW-10 — Organisation Standard (pending or blocked) cannot VIEW

Checks that a user with organisation role `standard` and status `pending` or `blocked` cannot VIEW a record in the `organisationUserPermissions` collection.

### PDBP-OUP-VIEW-OWN-04 — Organisation Admin can VIEW OWN

Checks that a user with organisation role `admin` can VIEW their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-VIEW-OWN-05 — Organisation Standard can VIEW OWN

Checks that a user with organisation role `standard` can VIEW their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-LIST-07 — Organisation Admin (approved) can LIST

Checks that a user with organisation role `admin` and status `approved` can LIST records in the `organisationUserPermissions` collection.

### PDBP-OUP-LIST-08 — Organisation Admin (pending or blocked) cannot LIST

Checks that a user with organisation role `admin` and status `pending` or `blocked` cannot LIST records in the `organisationUserPermissions` collection.

### PDBP-OUP-LIST-09 — Organisation Standard (approved) can LIST

Checks that a user with organisation role `standard` and status `approved` can LIST records in the `organisationUserPermissions` collection.

### PDBP-OUP-LIST-10 — Organisation Standard (pending or blocked) cannot LIST

Checks that a user with organisation role `standard` and status `pending` or `blocked` cannot LIST records in the `organisationUserPermissions` collection.

### PDBP-OUP-LIST-OWN-04 — Organisation Admin can LIST OWN

Checks that a user with organisation role `admin` can LIST their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-LIST-OWN-05 — Organisation Standard can LIST OWN

Checks that a user with organisation role `standard` can LIST their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-UPDATE-05 — Organisation Admin (approved) can UPDATE

Checks that a user with organisation role `admin` and status `approved` can UPDATE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-UPDATE-06 — Organisation Admin (pending or blocked) cannot UPDATE

Checks that a user with organisation role `admin` and status `pending` or `blocked` cannot UPDATE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-UPDATE-07 — Organisation Standard cannot UPDATE

Checks that a user with organisation role `standard` cannot UPDATE a record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-UPDATE-OWN-04 — Organisation Admin cannot UPDATE OWN

Checks that a user with organisation role `admin` cannot UPDATE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-UPDATE-OWN-05 — Organisation Standard cannot UPDATE OWN

Checks that a user with organisation role `standard` cannot UPDATE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-DELETE-05 — Organisation Admin (approved) can DELETE

Checks that a user with organisation role `admin` and status `approved` can DELETE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-DELETE-06 — Organisation Admin (pending or blocked) cannot DELETE

Checks that a user with organisation role `admin` and status `pending` or `blocked` cannot DELETE a record in the `organisationUserPermissions` collection.

### PDBP-OUP-DELETE-07 — Organisation Standard cannot DELETE

Checks that a user with organisation role `standard` cannot DELETE a record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-DELETE-OWN-04 — Organisation Admin cannot DELETE OWN

Checks that a user with organisation role `admin` cannot DELETE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-OUP-DELETE-OWN-05 — Organisation Standard cannot DELETE OWN

Checks that a user with organisation role `standard` cannot DELETE their own record in the `organisationUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.
