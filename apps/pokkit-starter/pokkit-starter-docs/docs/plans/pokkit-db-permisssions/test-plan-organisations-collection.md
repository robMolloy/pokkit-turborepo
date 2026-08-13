# Organisations collection test plan

## Scope

This plan covers required tests for the Pokkit Db Permissions initialization plugin:

Each test is given a tag in the following format. PDBP-{COLLECTION}-{ACTION}-{NN} In order to track the tests more easily.

---

## Organisations collection setup tests

### PDBP-ORG-SETUP-01 — Verify collection presence and validity is setup correctly

Checks that the default `organisations` collection from the database after plugin initialization is present and set up correctly.

### PDBP-ORG-SETUP-02 — First user created is given approved admin in organisationUserPermissions

Checks that the first user created is given an approved admin record in the `organisationUserPermissions` collection.

### PDBP-ORG-SETUP-03 — Organisation creator is provisioned as approved admin for the new organisation

Checks that the creator of the organisation is provisioned as an approved admin in the `organisationUserPermissions` collection for the new organisation.

## Global role permissions tests

### PDBP-ORG-CREATE-01 — Global Superadmin can CREATE

Checks that a user with global user permissions role `superadmin` can CREATE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-CREATE-02 — Global Admin cannot CREATE

Checks that a user with global user permissions role `admin` cannot CREATE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-CREATE-03 — Global Standard cannot CREATE

Checks that a user with global user permissions role `standard` cannot CREATE a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-VIEW-01 — Global Superadmin can VIEW

Checks that a user with global user permissions role `superadmin` can VIEW a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-VIEW-02 — Global Admin can VIEW

Checks that a user with global user permissions role `admin` can VIEW a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-VIEW-03 — Global Standard can VIEW

Checks that a user with global user permissions role `standard` can VIEW a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-LIST-01 — Global Superadmin can LIST

Checks that a user with global user permissions role `superadmin` can LIST records in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-LIST-02 — Global Admin can LIST

Checks that a user with global user permissions role `admin` can LIST records in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-LIST-03 — Global Standard can LIST

Checks that a user with global user permissions role `standard` can LIST records in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

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

### PDBP-ORG-VIEW-04 — Organisation Admin can VIEW

Checks that a user with organisation role `admin` can VIEW a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-VIEW-05 — Organisation Standard can VIEW

Checks that a user with organisation role `standard` can VIEW a record in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-LIST-04 — Organisation Admin can LIST

Checks that a user with organisation role `admin` can LIST records in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-ORG-LIST-05 — Organisation Standard can LIST

Checks that a user with organisation role `standard` can LIST records in the `organisations` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

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

### PDBP-ORG-CREATE-OTHER-01 — Organisation Admin (approved) cannot CREATE other org

Checks that a user with organisation role `admin` and status `approved` cannot CREATE another organisation.

### PDBP-ORG-UPDATE-OTHER-01 — Organisation Admin (approved) cannot UPDATE other org

Checks that a user with organisation role `admin` and status `approved` cannot UPDATE another organisation.

### PDBP-ORG-DELETE-OTHER-01 — Organisation Admin (approved) cannot DELETE other org

Checks that a user with organisation role `admin` and status `approved` cannot DELETE another organisation.
