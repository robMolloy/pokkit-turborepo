---
sidebar_position: 1
---

# Spec

## Overview

The overview can be found [here](./index.mdx).

## Users collection

This uses the default PocketBase `users` collection, but with new rules added to enable superadmins to manage users.

| Condition | Action                                                          |
| --------- | --------------------------------------------------------------- |
| Superuser | Verifies the collection is in the database and set up correctly |

## Users permissions matrix

| Global Role     | Status   | Create | View | List | Update | Delete | Create Own | View Own | List Own | Update Own | Delete Own |
| --------------- | -------- | :----: | :--: | :--: | :----: | :----: | :--------: | :------: | :------: | :--------: | :--------: |
| **Super Admin** | Pending  |   ✅   |  ✅  |  ✅  |   ✅   |   ✅   |     ⊖      |    ✅    |    ✅    |     ❌     |     ❌     |
| _"_             | Approved |   ✅   |  ✅  |  ✅  |   ✅   |   ✅   |     ⊖      |    ✅    |    ✅    |     ❌     |     ❌     |
| _"_             | Blocked  |   ✅   |  ✅  |  ✅  |   ✅   |   ✅   |     ⊖      |    ✅    |    ✅    |     ❌     |     ❌     |
| **Admin**       | Pending  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |     ❌     |    ❌    |    ❌    |     ❌     |     ❌     |
| _"_             | Approved |   ❌   |  ✅  |  ✅  |   ❌   |   ❌   |     ❌     |    ✅    |    ✅    |     ❌     |     ✅     |
| _"_             | Blocked  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |     ❌     |    ❌    |    ❌    |     ❌     |     ❌     |
| **Standard**    | Pending  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |     ❌     |    ❌    |    ❌    |     ❌     |     ❌     |
| _"_             | Approved |   ❌   |  ✅  |  ✅  |   ❌   |   ❌   |     ❌     |    ✅    |    ✅    |     ❌     |     ✅     |
| _"_             | Blocked  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |     ❌     |    ❌    |    ❌    |     ❌     |     ❌     |

_Authentication actions such as verify user, change email, reset password, etc. are not addressed in this spec._

### First User

The first user created is provisioned as an approved superadmin in the `globalUserPermissions` collection.

| Condition          | Action                                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| First user created | Is given approved superadmin record in `globalUserPermissions` collection |

| Condition | Action                                                          |
| --------- | --------------------------------------------------------------- |
| Superuser | Verifies the collection is in the database and set up correctly |

## Organisation collections

| Condition                           | Action                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Superuser                           | Verifies the collection is in the database and set up correctly                                                         |
| Any global approved superadmin user | Can perform READ actions on the `organisations` collection                                                              |
| Global approved superadmin user     | Can perform CREATE/UPDATE/DELETE actions on any record in `organisations` collection                                    |
| Global admin user                   | Can't perform CREATE/UPDATE/DELETE actions on any record in `organisations` collection                                  |
| Global standard user                | Can't perform CREATE/UPDATE/DELETE actions on any record in `organisations` collection                                  |
| Organisation admin user             | Can perform UPDATE/DELETE actions on the record in `organisations` collection where they are the admin                  |
| Organisation standard user          | Can't perform CREATE/UPDATE/DELETE actions on the record in `organisations` collection where they are the standard user |

## Organisation user permissions collection

| Condition                       | Action                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Superuser                       | Verifies the collection is in the database and set up correctly                                             |
| Global approved superadmin user | Can perform CRUD actions on any record in `organisationUserPermissions` collection                          |
| Global admin user               | Can't perform CRUD actions on any record in `organisationUserPermissions` collection                        |
| Global standard user            | Can't perform CRUD actions on any record in `organisationUserPermissions` collection                        |
| Organisation admin user         | Can perform CRUD actions on the record in `organisationUserPermissions` collection where they are the admin |
| Organisation standard user      | Can perform CRUD actions on their own record in `organisationUserPermissions` collection                    |
| Organisation standard user      | Can't perform CRUD actions on another user's record in `organisationUserPermissions` collection             |

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
