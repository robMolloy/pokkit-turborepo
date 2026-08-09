# Test Plan 2

## Scope

This plan covers required tests for the Pokkit Db Permissions initialization plugin:

---

## Users collection

### PDBP-USERS-01 — Verify collection presence and validity is setup correctly

Checks that the default `users` collection from the database after plugin initialization is present and set up correctly.

## Users permissions matrix — Create

### PDBP-USERS-02 — Global Superadmin can CREATE

Checks that a user with global user permissions role `superadmin` can CREATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-03 — Global Admin cannot CREATE

Checks that a user with global user permissions role `admin` cannot CREATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-04 — Global Standard cannot CREATE

Checks that a user with global user permissions role `standard` cannot CREATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

## Users permissions matrix — Update

### PDBP-USERS-05 — Global Superadmin can UPDATE

Checks that a user with global user permissions role `superadmin` can UPDATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-06 — Global Admin cannot UPDATE

Checks that a user with global user permissions role `admin` cannot UPDATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-07 — Global Standard cannot UPDATE

Checks that a user with global user permissions role `standard` cannot UPDATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.
