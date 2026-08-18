---
sidebar_position: 1
---

# Spec

## Overview

The overview can be found [here](./index.mdx).

## Permissions philosophy

The current philosophy makes it very difficult to "lock yourself out". For example, a global superadmin cannot update or delete themselves. This stops the user from being able to lock themselves out of the system.

The same is done for organisation admins which cannot update or delete themselves from their own organisation. This stops the user from being able to lock themselves out of the organisation.

Any scenario can be remedied by using the superuser (not to be confused with global superadmin) to change any records through the db ui but this method should not be required in normal usage, based on the philosophy above.

It may be that there are more intuitive ways to handle this, including through event hooks that stop the last superuser from being able to delete/update themselves in a way that causes lock out scenarios.

## Users collection

This uses the default PocketBase `users` collection

### Future extension

An extension to the users collection could enable global superadmins to manage users.

⊝ = No change from default behaviour

| Global Role     | Status   | Create | View | List | Update | Delete | Create Own | View Own | List Own | Update Own | Delete Own |
| --------------- | -------- | :----: | :--: | :--: | :----: | :----: | :--------: | :------: | :------: | :--------: | :--------: |
| **Super Admin** | Pending  |   ✅   |  ⊝   |  ⊝   |   ✅   |   ✅   |     ❌     |    ⊝     |    ⊝     |     ❌     |     ❌     |
| _"_             | Approved |   ✅   |  ⊝   |  ⊝   |   ✅   |   ✅   |     ❌     |    ⊝     |    ⊝     |     ❌     |     ❌     |
| _"_             | Blocked  |   ✅   |  ⊝   |  ⊝   |   ✅   |   ✅   |     ❌     |    ⊝     |    ⊝     |     ❌     |     ❌     |
| **Admin**       | Pending  |   ⊝    |  ⊝   |  ⊝   |   ⊝    |   ⊝    |     ⊝      |    ⊝     |    ⊝     |     ⊝      |     ⊝      |
| _"_             | Approved |   ⊝    |  ⊝   |  ⊝   |   ⊝    |   ⊝    |     ⊝      |    ⊝     |    ⊝     |     ⊝      |     ⊝      |
| _"_             | Blocked  |   ⊝    |  ⊝   |  ⊝   |   ⊝    |   ⊝    |     ⊝      |    ⊝     |    ⊝     |     ⊝      |     ⊝      |
| **Standard**    | Pending  |   ⊝    |  ⊝   |  ⊝   |   ⊝    |   ⊝    |     ⊝      |    ⊝     |    ⊝     |     ⊝      |     ⊝      |
| _"_             | Approved |   ⊝    |  ⊝   |  ⊝   |   ⊝    |   ⊝    |     ⊝      |    ⊝     |    ⊝     |     ⊝      |     ⊝      |
| _"_             | Blocked  |   ⊝    |  ⊝   |  ⊝   |   ⊝    |   ⊝    |     ⊝      |    ⊝     |    ⊝     |     ⊝      |     ⊝      |

## Global User Permissions collection

### setup

| Condition | Action                                                          |
| --------- | --------------------------------------------------------------- |
| Superuser | Verifies the collection is in the database and set up correctly |

### First User Behaviour

The first user created is provisioned as an approved superadmin in the `globalUserPermissions` collection.

| Condition          | Action                                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| First user created | Is given approved superadmin record in `globalUserPermissions` collection |

### Global User Permissions collection permissions matrix

| Global Role     | Status   | Create | View | List | Update | Delete | Create Own | View Own | List Own | Update Own | Delete Own |
| --------------- | -------- | :----: | :--: | :--: | :----: | :----: | :--------: | :------: | :------: | :--------: | :--------: |
| **Super Admin** | Pending  |   ✅   |  ✅  |  ✅  |   ✅   |   ✅   |     ❌     |    ✅    |    ✅    |     ❌     |     ❌     |
| _"_             | Approved |   ✅   |  ✅  |  ✅  |   ✅   |   ✅   |     ❌     |    ✅    |    ✅    |     ❌     |     ❌     |
| _"_             | Blocked  |   ✅   |  ✅  |  ✅  |   ✅   |   ✅   |     ❌     |    ✅    |    ✅    |     ❌     |     ❌     |
| **Admin**       | Pending  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |     ❌     |    ✅    |    ✅    |     ❌     |     ❌     |
| _"_             | Approved |   ❌   |  ✅  |  ✅  |   ❌   |   ❌   |     ❌     |    ✅    |    ✅    |     ❌     |     ✅     |
| _"_             | Blocked  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |     ❌     |    ✅    |    ✅    |     ❌     |     ❌     |
| **Standard**    | Pending  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |     ❌     |    ✅    |    ✅    |     ❌     |     ❌     |
| _"_             | Approved |   ❌   |  ✅  |  ✅  |   ❌   |   ❌   |     ❌     |    ✅    |    ✅    |     ❌     |     ✅     |
| _"_             | Blocked  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |     ❌     |    ✅    |    ✅    |     ❌     |     ❌     |

## Organisation collections

### setup

| Condition | Action                                                                          |
| --------- | ------------------------------------------------------------------------------- |
| Superuser | Verifies the `organisations` collection is in the database and set up correctly |

### Organisation Creator Behaviour

The creator of the organisation is provisioned as an approved admin in the `organisationUserPermissions` collection for the new organisation.

| Condition          | Action                                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| First user created | Is given approved admin record in `organisationUserPermissions` collection |

### Organisation collection permissions matrix

| Global Role     | Status   | Create | View | List | Update | Delete |
| --------------- | -------- | :----: | :--: | :--: | :----: | :----: |
| **Super Admin** | Pending  |   ✅   |  ✅  |  ✅  |   ✅   |   ✅   |
| _"_             | Approved |   ✅   |  ✅  |  ✅  |   ✅   |   ✅   |
| _"_             | Blocked  |   ✅   |  ✅  |  ✅  |   ✅   |   ✅   |
| **Admin**       | Pending  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |
| _"_             | Approved |   ❌   |  ✅  |  ✅  |   ❌   |   ❌   |
| _"_             | Blocked  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |
| **Standard**    | Pending  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |
| _"_             | Approved |   ❌   |  ✅  |  ✅  |   ❌   |   ❌   |
| _"_             | Blocked  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |

| Organisation Role | Status   | Create | View | List | Update | Delete |
| ----------------- | -------- | :----: | :--: | :--: | :----: | :----: |
| **Admin**         | Pending  |  N/A   |  ✅  |  ✅  |   ❌   |   ❌   |
| _"_               | Approved |  N/A   |  ✅  |  ✅  |   ✅   |   ✅   |
| _"_               | Blocked  |  N/A   |  ✅  |  ✅  |   ❌   |   ❌   |
| **Standard**      | Pending  |  N/A   |  ❌  |  ❌  |   ❌   |   ❌   |
| _"_               | Approved |  N/A   |  ✅  |  ✅  |   ❌   |   ❌   |
| _"_               | Blocked  |  N/A   |  ❌  |  ❌  |   ❌   |   ❌   |

N/A = Not Applicable - If the organisation does not exist, a user cannot be part of that organisation so a CREATE action by a member of that organisation does not make sense

### Organisation Isolation

Check that a member of an organisation can only (create) update and delete their own organisation and not other organisations. i.e. organisation isolation.

| Organisation Role | Status   | Create other org | Update other org | Delete other org |
| ----------------- | -------- | :--------------: | :--------------: | :--------------: |
| **Admin**         | Approved |        ❌        |        ❌        |        ❌        |

## Organisation User Permissions Collection

### setup

| Condition | Action                                                                                        |
| --------- | --------------------------------------------------------------------------------------------- |
| Superuser | Verifies the `organisationUserPermissions` collection is in the database and set up correctly |

### Organisation User Permissions collection permissions matrix

| Global Role     | Status   | Create | View | List | Update | Delete |
| --------------- | -------- | :----: | :--: | :--: | :----: | :----: |
| **Super Admin** | Pending  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |
| _"_             | Approved |   ✅   |  ✅  |  ✅  |   ✅   |   ✅   |
| _"_             | Blocked  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |
| **Admin**       | Pending  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |
| _"_             | Approved |   ❌   |  ✅  |  ✅  |   ❌   |   ❌   |
| _"_             | Blocked  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |
| **Standard**    | Pending  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |
| _"_             | Approved |   ❌   |  ✅  |  ✅  |   ❌   |   ❌   |
| _"_             | Blocked  |   ❌   |  ❌  |  ❌  |   ❌   |   ❌   |

| Organisation Role | Status   | Create (As Member) | View (As Member) | List (As Member) | Update (As Member) | Delete (As Member) |
| ----------------- | -------- | :----------------: | :--------------: | :--------------: | :----------------: | :----------------: |
| **Admin**         | Pending  |         ❌         |        ❌        |        ❌        |         ❌         |         ❌         |
| _"_               | Approved |         ✅         |        ✅        |        ✅        |         ✅         |         ✅         |
| _"_               | Blocked  |         ❌         |        ❌        |        ❌        |         ❌         |         ❌         |
| **Standard**      | Pending  |         ❌         |        ❌        |        ❌        |         ❌         |         ❌         |
| _"_               | Approved |         ❌         |        ✅        |        ✅        |         ❌         |         ❌         |
| _"_               | Blocked  |         ❌         |        ❌        |        ❌        |         ❌         |         ❌         |

| Organisation Role | Status   | Create (As Non-Member) | View (As Non-Member) | List (As Non-Member) | Update (As Non-Member) | Delete (As Non-Member) |
| ----------------- | -------- | :--------------------: | :------------------: | :------------------: | :--------------------: | :--------------------: |
| **Admin**         | Pending  |           ❌           |          ❌          |          ❌          |           ❌           |           ❌           |
| _"_               | Approved |           ❌           |          ❌          |          ❌          |           ❌           |           ❌           |
| _"_               | Blocked  |           ❌           |          ❌          |          ❌          |           ❌           |           ❌           |
| **Standard**      | Pending  |           ❌           |          ❌          |          ❌          |           ❌           |           ❌           |
| _"_               | Approved |           ❌           |          ❌          |          ❌          |           ❌           |           ❌           |
| _"_               | Blocked  |           ❌           |          ❌          |          ❌          |           ❌           |           ❌           |

| Organisation Role | Status   | Create Own | View Own | List Own | Update Own | Delete Own |
| ----------------- | -------- | :--------: | :------: | :------: | :--------: | :--------: |
| **Admin**         | Pending  |    N/A     |    ✅    |    ✅    |     ❌     |     ❌     |
| _"_               | Approved |    N/A     |    ✅    |    ✅    |     ❌     |     ❌     |
| _"_               | Blocked  |    N/A     |    ✅    |    ✅    |     ❌     |     ❌     |
| **Standard**      | Pending  |    N/A     |    ✅    |    ✅    |     ❌     |     ❌     |
| _"_               | Approved |    N/A     |    ✅    |    ✅    |     ❌     |     ❌     |
| _"_               | Blocked  |    N/A     |    ✅    |    ✅    |     ❌     |     ❌     |
