# Organisations collection test plan

## Scope

This plan covers required tests for the Pokkit Db Permissions plugin:

Each test is given a tag in the following format. PDBP-{COLLECTION}-{ACTION}-{NN} In order to track the tests more easily.

---

## Organisations collection setup tests

### PDBP-ORG-SETUP-01 — Verify collection presence and validity is setup correctly

Checks that the default `organisations` collection from the database after plugin initialization is present and set up correctly.

### PDBP-ORG-SETUP-02 — Organisation creator becomes approved admin in organisationUserPermissions

The user who creates the organisation becomes an approved admin in the `organisationUserPermissions` collection for the new organisation.

## Global role permissions tests

### PDBP-ORG-CREATE-01 — Global Superadmin can CREATE

Checks that a user with global user permissions role `superadmin` can CREATE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-CREATE-02 — Global Admin cannot CREATE

Checks that a user with global user permissions role `admin` cannot CREATE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-CREATE-03 — Global Standard cannot CREATE

Checks that a user with global user permissions role `standard` cannot CREATE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-VIEW-01 — Global Superadmin can VIEW

Checks that a user with global user permissions role `superadmin` can VIEW a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-VIEW-02 — Global Admin (approved) can VIEW

Checks that a user with global user permissions role `admin` and status `approved` can VIEW a record in the `organisations` collection.

### PDBP-ORG-VIEW-03 — Global Admin (pending or blocked) cannot VIEW

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot VIEW a record in the `organisations` collection.

### PDBP-ORG-VIEW-04 — Global Standard (approved) can VIEW

Checks that a user with global user permissions role `standard` and status `approved` can VIEW a record in the `organisations` collection.

### PDBP-ORG-VIEW-05 — Global Standard (pending or blocked) cannot VIEW

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot VIEW a record in the `organisations` collection.

### PDBP-ORG-LIST-01 — Global Superadmin can LIST

Checks that a user with global user permissions role `superadmin` can LIST records in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-LIST-02 — Global Admin (approved) can LIST

Checks that a user with global user permissions role `admin` and status `approved` can LIST records in the `organisations` collection.

### PDBP-ORG-LIST-03 — Global Admin (pending or blocked) cannot LIST

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot LIST records in the `organisations` collection.

### PDBP-ORG-LIST-04 — Global Standard (approved) can LIST

Checks that a user with global user permissions role `standard` and status `approved` can LIST records in the `organisations` collection.

### PDBP-ORG-LIST-05 — Global Standard (pending or blocked) cannot LIST

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot LIST records in the `organisations` collection.

### PDBP-ORG-UPDATE-01 — Global Superadmin can UPDATE

Checks that a user with global user permissions role `superadmin` can UPDATE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-UPDATE-02 — Global Admin cannot UPDATE

Checks that a user with global user permissions role `admin` cannot UPDATE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-UPDATE-03 — Global Standard cannot UPDATE

Checks that a user with global user permissions role `standard` cannot UPDATE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-DELETE-01 — Global Superadmin can DELETE

Checks that a user with global user permissions role `superadmin` can DELETE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-DELETE-02 — Global Admin cannot DELETE

Checks that a user with global user permissions role `admin` cannot DELETE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-DELETE-03 — Global Standard cannot DELETE

Checks that a user with global user permissions role `standard` cannot DELETE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

## Organisation role permissions tests

Organisation role CREATE is N/A and is not tested.

### PDBP-ORG-VIEW-06 — Organisation Admin can VIEW

Checks that a user with organisation role `admin` can VIEW a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-VIEW-07 — Organisation Standard (approved) can VIEW

Checks that a user with organisation role `standard` and status `approved` can VIEW a record in the `organisations` collection.

### PDBP-ORG-VIEW-08 — Organisation Standard (pending or blocked) cannot VIEW

Checks that a user with organisation role `standard` and status `pending` or `blocked` cannot VIEW a record in the `organisations` collection.

### PDBP-ORG-LIST-06 — Organisation Admin (approved) can LIST

Checks that a user with organisation role `admin` can LIST records in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-LIST-07 — Organisation Standard (pending or blocked) cannot LIST

Checks that a user with organisation role `standard` and status `pending` or `blocked` cannot LIST records in the `organisations` collection.

### PDBP-ORG-LIST-08 — Organisation Standard (approved) can LIST

Checks that a user with organisation role `standard` and status `approved` can LIST records in the `organisations` collection.

### PDBP-ORG-LIST-08 — Organisation Standard (pending or blocked) cannot LIST

Checks that a user with organisation role `standard` and status `pending` or `blocked` cannot LIST records in the `organisations` collection.

### PDBP-ORG-UPDATE-04 — Organisation Admin (approved) can UPDATE

Checks that a user with organisation role `admin` and status `approved` can UPDATE a record in the `organisations` collection.

### PDBP-ORG-UPDATE-05 — Organisation Admin (pending or blocked) cannot UPDATE

Checks that a user with organisation role `admin` and status `pending` or `blocked` cannot UPDATE a record in the `organisations` collection.

### PDBP-ORG-UPDATE-06 — Organisation Standard cannot UPDATE

Checks that a user with organisation role `standard` cannot UPDATE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-DELETE-04 — Organisation Admin (approved) can DELETE

Checks that a user with organisation role `admin` and status `approved` can DELETE a record in the `organisations` collection.

### PDBP-ORG-DELETE-05 — Organisation Admin (pending or blocked) cannot DELETE

Checks that a user with organisation role `admin` and status `pending` or `blocked` cannot DELETE a record in the `organisations` collection.

### PDBP-ORG-DELETE-06 — Organisation Standard cannot DELETE

Checks that a user with organisation role `standard` cannot DELETE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

## Organisation isolation tests

### PDBP-ORG-ISOLATION-CREATE-OTHER-01 — Organisation Admin (approved) cannot CREATE other org

Checks that a user with organisation role `admin` and status `approved` cannot CREATE another organisation.

### PDBP-ORG-ISOLATION-UPDATE-OTHER-01 — Organisation Admin (approved) cannot UPDATE other org

Checks that a user with organisation role `admin` and status `approved` cannot UPDATE another organisation.

### PDBP-ORG-ISOLATION-DELETE-OTHER-01 — Organisation Admin (approved) cannot DELETE other org

Checks that a user with organisation role `admin` and status `approved` cannot DELETE another organisation.
