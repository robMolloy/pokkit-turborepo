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

## Users permissions matrix — View

### PDBP-USERS-05 — Global Superadmin can VIEW

Checks that a user with global user permissions role `superadmin` can VIEW a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-06 — Global Admin (approved) can VIEW

Checks that a user with global user permissions role `admin` and status `approved` can VIEW a record in the `users` collection.

### PDBP-USERS-07 — Global Admin (pending or blocked) cannot VIEW

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot VIEW a record in the `users` collection.

### PDBP-USERS-08 — Global Standard (approved) can VIEW

Checks that a user with global user permissions role `standard` and status `approved` can VIEW a record in the `users` collection.

### PDBP-USERS-09 — Global Standard (pending or blocked) cannot VIEW

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot VIEW a record in the `users` collection.

## Users permissions matrix — View Own

### PDBP-USERS-10 — Global Superadmin can VIEW Own

Checks that a user with global user permissions role `superadmin` can VIEW their own record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-11 — Global Admin (approved) can VIEW Own

Checks that a user with global user permissions role `admin` and status `approved` can VIEW their own record in the `users` collection.

### PDBP-USERS-12 — Global Admin (pending or blocked) cannot VIEW Own

Checks that a user with global user permissions role `admin` and status `pending` or `blocked` cannot VIEW their own record in the `users` collection.

### PDBP-USERS-13 — Global Standard (approved) can VIEW Own

Checks that a user with global user permissions role `standard` and status `approved` can VIEW their own record in the `users` collection.

### PDBP-USERS-14 — Global Standard (pending or blocked) cannot VIEW Own

Checks that a user with global user permissions role `standard` and status `pending` or `blocked` cannot VIEW their own record in the `users` collection.

## Users permissions matrix — Update

### PDBP-USERS-15 — Global Superadmin can UPDATE

Checks that a user with global user permissions role `superadmin` can UPDATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-16 — Global Admin cannot UPDATE

Checks that a user with global user permissions role `admin` cannot UPDATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.

### PDBP-USERS-17 — Global Standard cannot UPDATE

Checks that a user with global user permissions role `standard` cannot UPDATE a record in the `users` collection - it is not relevant whether the user is `pending`, `approved`, or `blocked`.
