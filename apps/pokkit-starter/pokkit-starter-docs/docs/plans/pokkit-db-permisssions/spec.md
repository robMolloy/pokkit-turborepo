---
sidebar_position: 1
---

# Spec2

## Overview

The overview can be found [here](./index.mdx).

## First User

The first user created is provisioned as an approved superadmin in the `globalUserPermissions` collection.

| Condition          | Action                                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| First user created | Is given approved superadmin record in `globalUserPermissions` collection |

## Users collection

This uses the default PocketBase `users` collection, but with new rules added to enable superadmins to manage users.

| Condition                       | Action                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Superuser                       | Verifies the collection is in the database and set up correctly                  |
| Global approved superadmin user | Can perform CREATE/READ/UPDATE actions on their own record in `users` collection |
| Global approved superadmin user | Can't perform DELETE action on their own record in `users` collection            |
| Global approved superadmin user | Can DELETE other user records from the `users` collection                        |
| Global admin user               | Can perform CRUD actions on their own record in `users` collection               |
| Global admin user               | Can't perform CRUD actions on another user's record in `users` collection        |
| Global standard user            | Can perform CRUD actions on their own record in `users` collection               |
| Global standard user            | Can't perform CRUD actions on another user's record in `users` collection        |

Authentication actions such as verify user, change email, reset password, etc. are not addressed in this spec.

## Organisation collections

| Condition                       | Action                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Superuser                       | Verifies the collection is in the database and set up correctly                                         |
| Global approved superadmin user | Can perform CRUD actions on any record in `organisations` collection                                    |
| Global admin user               | Can't perform CRUD actions on any record in `organisations` collection                                  |
| Global standard user            | Can't perform CRUD actions on any record in `organisations` collection                                  |
| Organisation admin user         | Can perform CRUD actions on the record in `organisations` collection where they are the admin           |
| Organisation standard user      | Can't perform CRUD actions on the record in `organisations` collection where they are the standard user |

## Organisation users collection

| Condition                       | Action                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Superuser                       | Verifies the collection is in the database and set up correctly                                   |
| Global approved superadmin user | Can perform CRUD actions on any record in `organisationUsers` collection                          |
| Global admin user               | Can't perform CRUD actions on any record in `organisationUsers` collection                        |
| Global standard user            | Can't perform CRUD actions on any record in `organisationUsers` collection                        |
| Organisation admin user         | Can perform CRUD actions on the record in `organisationUsers` collection where they are the admin |
| Organisation standard user      | Can perform CRUD actions on their own record in `organisationUsers` collection                    |
| Organisation standard user      | Can't perform CRUD actions on another user's record in `organisationUsers` collection             |

## Custom collections

### onlyCanCrudIfGlobalSuperadmin collection

Rules for this collection:

```
@request.auth.id != ""
&& @collection.globalUserPermissions.userId ?= @request.auth.id
&& @collection.globalUserPermissions.role ?= "superadmin"
```

| Condition                       | Action                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| Superuser                       | Verifies the collection is in the database and set up correctly                        |
| Global superadmin user          | Can perform CRUD actions on any record in `onlyCanCrudIfGlobalSuperadmin` collection   |
| Global approved superadmin user | Can perform CRUD actions on any record in `onlyCanCrudIfGlobalSuperadmin` collection   |
| Global blocked superadmin user  | Can perform CRUD actions on any record in `onlyCanCrudIfGlobalSuperadmin` collection   |
| Global pending superadmin user  | Can perform CRUD actions on any record in `onlyCanCrudIfGlobalSuperadmin` collection   |
| Global admin user               | Can't perform CRUD actions on any record in `onlyCanCrudIfGlobalSuperadmin` collection |
| Global standard user            | Can't perform CRUD actions on any record in `onlyCanCrudIfGlobalSuperadmin` collection |
| Organisation admin user         | Can't perform CRUD actions on any record in `onlyCanCrudIfGlobalSuperadmin` collection |
| Organisation standard user      | Can't perform CRUD actions on any record in `onlyCanCrudIfGlobalSuperadmin` collection |

### onlyCanCrudIfYourOwnRecord collection

Rules for this collection:

```
@request.auth.id != ""
&& userId ?= @request.auth.id
```

| Condition                  | Action                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| Superuser                  | Verifies the collection is in the database and set up correctly                                |
| Global superadmin user     | Can only perform CRUD actions on their own record in `onlyCanCrudIfYourOwnRecord` collection   |
| Global superadmin user     | Can't perform CRUD actions on another user's record in `onlyCanCrudIfYourOwnRecord` collection |
| Global admin user          | Can only perform CRUD actions on their own record in `onlyCanCrudIfYourOwnRecord` collection   |
| Global standard user       | Can't perform CRUD actions on another user's record in `onlyCanCrudIfYourOwnRecord` collection |
| Organisation admin user    | Can only perform CRUD actions on their own record in `onlyCanCrudIfYourOwnRecord` collection   |
| Organisation standard user | Can't perform CRUD actions on another user's record in `onlyCanCrudIfYourOwnRecord` collection |

### onlyCanCrudIfUserInOrganisation collection

Rules for this collection:

```
@request.auth.id != ""
&& @collection.organisationUserPermissions.userId ?= @request.auth.id
&& @collection.organisationUserPermissions.organisationId ?= organisationId
```

| Condition                  | Action                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Superuser                  | Verifies the collection is in the database and set up correctly                          |
| Global superadmin user     | Can't perform CRUD actions on any record in `onlyCanCrudIfUserInOrganisation` collection |
| Global admin user          | Can't perform CRUD actions on any record in `onlyCanCrudIfUserInOrganisation` collection |
| Global standard user       | Can't perform CRUD actions on any record in `onlyCanCrudIfUserInOrganisation` collection |
| Organisation admin user    | Can perform CRUD actions on any record in `onlyCanCrudIfUserInOrganisation` collection   |
| Organisation standard user | Can perform CRUD actions on any record in `onlyCanCrudIfUserInOrganisation` collection   |

### onlyCanCrudIfAdminUserInOrganisation collection

Rules for this collection:

```
@request.auth.id != ""
&& @collection.organisationUserPermissions.userId ?= @request.auth.id
&& @collection.organisationUserPermissions.organisationId ?= organisationId
&& @collection.organisationUserPermissions.role ?= "admin"
```

| Condition                  | Action                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| Superuser                  | Verifies the collection is in the database and set up correctly                               |
| Global superadmin user     | Can't perform CRUD actions on any record in `onlyCanCrudIfAdminUserInOrganisation` collection |
| Global admin user          | Can't perform CRUD actions on any record in `onlyCanCrudIfAdminUserInOrganisation` collection |
| Global standard user       | Can't perform CRUD actions on any record in `onlyCanCrudIfAdminUserInOrganisation` collection |
| Organisation admin user    | Can perform CRUD actions on any record in `onlyCanCrudIfAdminUserInOrganisation` collection   |
| Organisation standard user | Can't perform CRUD actions on any record in `onlyCanCrudIfAdminUserInOrganisation` collection |
