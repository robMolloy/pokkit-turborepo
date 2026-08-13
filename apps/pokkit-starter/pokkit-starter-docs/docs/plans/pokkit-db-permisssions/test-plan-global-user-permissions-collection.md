# Users collection test plan

## Scope

This plan covers required tests for the Pokkit Db Permissions plugin:

Each test is given a tag in the following format. PDBP-{COLLECTION}-{ACTION}-{NN} In order to track the tests more easily.

---

## Global User Permissions collection setup tests

### PDBP-GUP-SETUP-01 — Verify collection presence and validity is setup correctly

Checks that the default `globalUserPermissions` collection from the database after plugin initialization is present and set up correctly.

### PDBP-GUP-SETUP-02 — First user created is a global superadmin

Checks that the first user created is a global superadmin.

## User permissions tests

### PDBP-GUP-CREATE-01 — Global Superadmin can CREATE

Checks that a user with global user permissions role `superadmin` can CREATE a record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-CREATE-02 — Global Admin cannot CREATE

Checks that a user with global user permissions role `admin` cannot CREATE a record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-CREATE-03 — Global Standard cannot CREATE

Checks that a user with global user permissions role `standard` cannot CREATE a record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-CREATE-OWN-01 — Global Superadmin cannot CREATE OWN

Checks that a user with global user permissions role `superadmin` cannot CREATE their own record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-CREATE-OWN-02 — Global Admin cannot CREATE OWN

Checks that a user with global user permissions role `admin` cannot CREATE their own record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-CREATE-OWN-03 — Global Standard cannot CREATE OWN

Checks that a user with global user permissions role `standard` cannot CREATE their own record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-VIEW-01 — Global Superadmin can VIEW

Checks that a user with global user permissions role `superadmin` can VIEW a record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-VIEW-02 — Global Admin (approved) can VIEW

Checks that a user with global user permissions role `admin` and status `approved` can VIEW a record in the `globalUserPermissions` collection.

### PDBP-GUP-VIEW-03 — Global Admin (pending or blocked) cannot VIEW

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot VIEW a record in the `globalUserPermissions` collection.

### PDBP-GUP-VIEW-04 — Global Standard (approved) can VIEW

Checks that a user with global user permissions role `standard` and status `approved` can VIEW a record in the `globalUserPermissions` collection.

### PDBP-GUP-VIEW-05 — Global Standard (pending or blocked) cannot VIEW

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot VIEW a record in the `globalUserPermissions` collection.

### PDBP-GUP-VIEW-OWN-01 — Global Superadmin can VIEW OWN

Checks that a user with global user permissions role `superadmin` can VIEW their own record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-VIEW-OWN-02 — Global Admin (approved) can VIEW OWN

Checks that a user with global user permissions role `admin` and status `approved` can VIEW their own record in the `globalUserPermissions` collection.

### PDBP-GUP-VIEW-OWN-03 — Global Admin (pending or blocked) cannot VIEW OWN

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot VIEW their own record in the `globalUserPermissions` collection.

### PDBP-GUP-VIEW-OWN-04 — Global Standard (approved) can VIEW OWN

Checks that a user with global user permissions role `standard` and status `approved` can VIEW their own record in the `globalUserPermissions` collection.

### PDBP-GUP-VIEW-OWN-05 — Global Standard (pending or blocked) cannot VIEW OWN

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot VIEW their own record in the `globalUserPermissions` collection.

### PDBP-GUP-LIST-01 — Global Superadmin can LIST

Checks that a user with global user permissions role `superadmin` can LIST records in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-LIST-02 — Global Admin (approved) can LIST

Checks that a user with global user permissions role `admin` and status `approved` can LIST records in the `globalUserPermissions` collection.

### PDBP-GUP-LIST-03 — Global Admin (pending or blocked) cannot LIST

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot LIST records in the `globalUserPermissions` collection.

### PDBP-GUP-LIST-04 — Global Standard (approved) can LIST

Checks that a user with global user permissions role `standard` and status `approved` can LIST records in the `globalUserPermissions` collection.

### PDBP-GUP-LIST-05 — Global Standard (pending or blocked) cannot LIST

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot LIST records in the `globalUserPermissions` collection.

### PDBP-GUP-LIST-OWN-01 — Global Superadmin can LIST OWN

Checks that a user with global user permissions role `superadmin` can LIST their own record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-LIST-OWN-02 — Global Admin (approved) can LIST OWN

Checks that a user with global user permissions role `admin` and status `approved` can LIST their own record in the `globalUserPermissions` collection.

### PDBP-GUP-LIST-OWN-03 — Global Admin (pending or blocked) cannot LIST OWN

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot LIST their own record in the `globalUserPermissions` collection.

### PDBP-GUP-LIST-OWN-04 — Global Standard (approved) can LIST OWN

Checks that a user with global user permissions role `standard` and status `approved` can LIST their own record in the `globalUserPermissions` collection.

### PDBP-GUP-LIST-OWN-05 — Global Standard (pending or blocked) cannot LIST OWN

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot LIST their own record in the `globalUserPermissions` collection.

### PDBP-GUP-UPDATE-01 — Global Superadmin can UPDATE

Checks that a user with global user permissions role `superadmin` can UPDATE a record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-UPDATE-02 — Global Admin cannot UPDATE

Checks that a user with global user permissions role `admin` cannot UPDATE a record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-UPDATE-03 — Global Standard cannot UPDATE

Checks that a user with global user permissions role `standard` cannot UPDATE a record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-UPDATE-OWN-01 — Global Superadmin cannot UPDATE OWN

Checks that a user with global user permissions role `superadmin` cannot UPDATE their own record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-UPDATE-OWN-02 — Global Admin cannot UPDATE OWN

Checks that a user with global user permissions role `admin` cannot UPDATE their own record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-UPDATE-OWN-03 — Global Standard cannot UPDATE OWN

Checks that a user with global user permissions role `standard` cannot UPDATE their own record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-DELETE-01 — Global Superadmin can DELETE

Checks that a user with global user permissions role `superadmin` can DELETE a record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-DELETE-02 — Global Admin cannot DELETE

Checks that a user with global user permissions role `admin` cannot DELETE a record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-DELETE-03 — Global Standard cannot DELETE

Checks that a user with global user permissions role `standard` cannot DELETE a record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-DELETE-OWN-01 — Global Superadmin cannot DELETE OWN

Checks that a user with global user permissions role `superadmin` cannot DELETE their own record in the `globalUserPermissions` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-GUP-DELETE-OWN-02 — Global Admin (approved) can DELETE OWN

Checks that a user with global user permissions role `admin` and status `approved` can DELETE their own record in the `globalUserPermissions` collection.

### PDBP-GUP-DELETE-OWN-03 — Global Admin (pending or blocked) cannot DELETE OWN

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot DELETE their own record in the `globalUserPermissions` collection.

### PDBP-GUP-DELETE-OWN-04 — Global Standard (approved) can DELETE OWN

Checks that a user with global user permissions role `standard` and status `approved` can DELETE their own record in the `globalUserPermissions` collection.

### PDBP-GUP-DELETE-OWN-05 — Global Standard (pending or blocked) cannot DELETE OWN

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot DELETE their own record in the `globalUserPermissions` collection.
