# Test Plan 2

## Scope

This plan covers required tests for the Pokkit Db Permissions initialization plugin:

Each test is given a tag in the following format. PDBP-USERS-{ACTION}-{NN} In order to track the tests more easily.

---

## Users collection

### PDBP-USERS-SETUP-01 — Verify collection presence and validity is setup correctly

Checks that the default `users` collection from the database after plugin initialization is present and set up correctly.

## Users permissions matrix — Create

### PDBP-USERS-CREATE-01 — Global Superadmin can CREATE

Checks that a user with global user permissions role `superadmin` can CREATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-CREATE-02 — Global Admin cannot CREATE

Checks that a user with global user permissions role `admin` cannot CREATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-CREATE-03 — Global Standard cannot CREATE

Checks that a user with global user permissions role `standard` cannot CREATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

## Users permissions matrix — View

### PDBP-USERS-VIEW-01 — Global Superadmin can VIEW

Checks that a user with global user permissions role `superadmin` can VIEW a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-VIEW-02 — Global Admin (approved) can VIEW

Checks that a user with global user permissions role `admin` and status `approved` can VIEW a record in the `users` collection.

### PDBP-USERS-VIEW-03 — Global Admin (pending or blocked) cannot VIEW

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot VIEW a record in the `users` collection.

### PDBP-USERS-VIEW-04 — Global Standard (approved) can VIEW

Checks that a user with global user permissions role `standard` and status `approved` can VIEW a record in the `users` collection.

### PDBP-USERS-VIEW-05 — Global Standard (pending or blocked) cannot VIEW

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot VIEW a record in the `users` collection.

## Users permissions matrix — View Own

### PDBP-USERS-VIEW-OWN-01 — Global Superadmin can VIEW Own

Checks that a user with global user permissions role `superadmin` can VIEW their own record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-VIEW-OWN-02 — Global Admin (approved) can VIEW Own

Checks that a user with global user permissions role `admin` and status `approved` can VIEW their own record in the `users` collection.

### PDBP-USERS-VIEW-OWN-03 — Global Admin (pending or blocked) cannot VIEW Own

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot VIEW their own record in the `users` collection.

### PDBP-USERS-VIEW-OWN-04 — Global Standard (approved) can VIEW Own

Checks that a user with global user permissions role `standard` and status `approved` can VIEW their own record in the `users` collection.

### PDBP-USERS-VIEW-OWN-05 — Global Standard (pending or blocked) cannot VIEW Own

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot VIEW their own record in the `users` collection.

## Users permissions matrix — Update

### PDBP-USERS-UPDATE-01 — Global Superadmin can UPDATE

Checks that a user with global user permissions role `superadmin` can UPDATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-UPDATE-02 — Global Admin cannot UPDATE

Checks that a user with global user permissions role `admin` cannot UPDATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-UPDATE-03 — Global Standard cannot UPDATE

Checks that a user with global user permissions role `standard` cannot UPDATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.
