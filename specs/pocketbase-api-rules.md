---
name: pocketbase-api-rules
description: Write and analyze PocketBase API rules for collection access control. Use this skill when working with PocketBase collections and need to create, understand, or debug API rules (listRule, viewRule, createRule, updateRule, deleteRule). Covers authentication checks, role-based access, owner-only patterns, SQL equivalents, and common security patterns for PocketBase databases.
---

# PocketBase API Rules Skill

This skill helps write effective PocketBase API rules with proper syntax, security patterns, and clear explanations.

## Quick Reference

### Rule Types

Each collection has up to 6 rule types:

- **listRule** - Controls listing/querying multiple records
- **viewRule** - Controls viewing a single record by ID
- **createRule** - Controls creating new records
- **updateRule** - Controls updating existing records
- **deleteRule** - Controls deleting records
- **manageRule** - (Auth collections only) Controls managing other users' accounts

### Rule Values

- `null` (locked) - Only superusers can perform the action
- `""` (empty string) - Anyone can perform the action (including unauthenticated)
- `"expression"` - Only those matching the filter expression can perform the action

### Common Patterns

**Authentication check:**

```javascript
@request.auth.id != ""
```

**Own record access (user owns the record):**

```javascript
@request.auth.id = userId
```

**Admin role check:**

```javascript
@collection.globalUserPermissions.userId ?= @request.auth.id &&
@collection.globalUserPermissions.role ?= "admin"
```

Note: Always use `?=` when querying `@collection.*` to check if matching records exist.

**Combined: Own record OR admin:**

```javascript
// With explicit parentheses (clearest):
@request.auth.id != "" && (
  @request.auth.id = userId ||
  (@collection.globalUserPermissions.userId ?= @request.auth.id &&
   @collection.globalUserPermissions.role ?= "admin")
)

// Without inner parentheses (works due to && precedence):
@request.auth.id != "" && (
  @request.auth.id = userId ||
  @collection.globalUserPermissions.userId ?= @request.auth.id &&
  @collection.globalUserPermissions.role ?= "admin"
)
```

**Public read, authenticated write:**

- listRule: `""` (anyone can list)
- viewRule: `""` (anyone can view)
- createRule: `@request.auth.id != ""` (must be logged in)
- updateRule: `@request.auth.id != "" && @request.auth.id = userId` (own records only)

### Critical Syntax Rules

1. **Operator precedence:** `&&` has higher precedence than `||`

```javascript
   // These are equivalent:
   condition1 || condition2 && condition3
   condition1 || (condition2 && condition3)

   // For clarity, explicit parentheses are recommended:
   @request.auth.id = id ||
   (@collection.globalUserPermissions.userId ?= @request.auth.id &&
    @collection.globalUserPermissions.role = "admin")

   // But this works identically due to && precedence:
   @request.auth.id = id ||
   @collection.globalUserPermissions.userId ?= @request.auth.id &&
   @collection.globalUserPermissions.role = "admin"
```

**Best practice:** Use parentheses for clarity even when not strictly required.

2. **The `?=` operator (existence check):**

   Use `?=` when querying `@collection.*` to check if any record exists that matches the condition.

```javascript
   // ✅ CORRECT - checks if ANY record in the collection matches
   @collection.permissions.userId ?= @request.auth.id &&
   @collection.permissions.role ?= "admin"

   // ❌ INCORRECT - unreliable, don't use = with @collection queries
   @collection.permissions.userId = @request.auth.id &&
   @collection.permissions.role = "admin"
```

**Key distinction:**

- `?=` → "Does any record exist where this field equals this value?"
- `=` → Direct comparison on the current record being accessed

**When chaining with `&&`:** PocketBase looks for at least one record that satisfies ALL conditions:

```javascript
   // This finds ONE record that matches all three conditions:
   @collection.organisationPermissions.userId ?= @request.auth.id &&
   @collection.organisationPermissions.orgId ?= organisationId &&
   @collection.organisationPermissions.role ?= "admin"
```

**Rule of thumb:** Always use `?=` with `@collection.*` queries.

3. **Field reference syntax:**

   When referencing fields in rules, use the field name directly:

```javascript
   // ✅ CORRECT - reference fields directly
   organisationId
   userId
   role

   // ❌ INCORRECT - @request.data is not valid syntax
   @request.data.organisationId
```

**Context matters:**

- In **createRule**: Field names refer to the incoming data being created
- In **updateRule/viewRule/deleteRule/listRule**: Field names refer to existing record fields
- The syntax is the same; PocketBase understands the context

**Example:**

```javascript
   // Same syntax works in both createRule and updateRule
   @request.auth.id != "" && @request.auth.id = userId

   // createRule: checks if auth.id matches the userId being submitted
   // updateRule: checks if auth.id matches the existing record's userId
```

4. **Authentication is NOT automatic:** Always explicitly check if user is authenticated:

```javascript
   @request.auth.id != ""
```

## Writing Rules Workflow

When asked to create API rules for a collection:

1. **Understand the access requirements:**
   - Who should be able to list/view/create/update/delete?
   - Are there role-based permissions?
   - Is there an owner/creator relationship?
   - Should unauthenticated users have any access?

2. **Start with the most restrictive rule first** (usually createRule or deleteRule)

3. **Build up the rule expression:**
   - Start with authentication check if needed
   - Add ownership check if applicable
   - Add role-based checks if applicable
   - Use parentheses to group OR conditions

4. **For each rule, provide:**
   - The PocketBase rule expression
   - Plain language explanation of permissions granted
   - SQL equivalent (if requested or helpful for understanding)
   - Any security considerations

5. **Test edge cases mentally:**
   - Unauthenticated users
   - Regular authenticated users
   - Record owners
   - Admins
   - Attempts to access other users' records

## Response Format

When providing rules, use this structure:

```
### [Collection Name] API Rules

**listRule:**
[rule expression]

**viewRule:**
[rule expression]

[... repeat for create/update/delete ...]

**Access Pattern Summary:**
[Table showing who can do what]
```

## Common Security Patterns

### Pattern 1: Owner-Only Access

Users can only access their own records.

```javascript
// All rules:
@request.auth.id != "" && @request.auth.id = userId
```

### Pattern 2: Public Read, Owner Write

Anyone can view, only owners can modify.

```javascript
// listRule & viewRule:
""

// createRule:
@request.auth.id != ""

// updateRule & deleteRule:
@request.auth.id != "" && @request.auth.id = userId
```

### Pattern 3: Admin-Only Management

Regular users have read access, only admins can modify.

```javascript
// listRule & viewRule:
@request.auth.id != ""

// createRule, updateRule, deleteRule:
@request.auth.id != "" &&
@collection.globalUserPermissions.userId ?= @request.auth.id &&
@collection.globalUserPermissions.role ?= "admin"
```

### Pattern 4: Owner or Admin

Users can access their own records, admins can access all.

```javascript
// All rules:
@request.auth.id != "" && (
  @request.auth.id = userId ||
  (@collection.globalUserPermissions.userId ?= @request.auth.id &&
   @collection.globalUserPermissions.role ?= "admin")
)
```

### Pattern 5: Multi-Tenant (Organization-Based)

Users can only access records in their organization.

```javascript
// All rules:
@request.auth.id != "" &&
@request.auth.organizationId = organizationId
```

### Pattern 6: Ownership Via Multi-Hop Relation

Access is granted based on ownership of a related record two or more levels up the relation chain. Useful when the record being accessed does not directly hold a `userId`, but a parent or grandparent record does.

```javascript
// All rules:
@request.auth.id != "" &&
@collection.parentCollection.id ?= parentId &&
@collection.grandparentCollection.id ?= @collection.parentCollection.grandparentId &&
@collection.grandparentCollection.userId ?= @request.auth.id
```

**How it works:** Each `@collection.*` line resolves one hop in the relation chain. The result of a previous collection query can be referenced on the right-hand side of a subsequent `?=` using `@collection.previousCollection.fieldName`. PocketBase evaluates these in sequence, effectively performing a multi-table join.

**SQL equivalent:**

```sql
SELECT 1 FROM currentTable t
JOIN parentCollection p ON p.id = t.parentId
JOIN grandparentCollection gp ON gp.id = p.grandparentId
WHERE gp.userId = :auth_user_id
```

**When to use this pattern:** When your schema has a chain of relations and ownership lives at the top of that chain. Common in subscription/resource hierarchies where a user owns a subscription, the subscription has requests, and the requests have child records.

## Advanced Patterns

For complex scenarios including:

- Detailed SQL equivalents for understanding
- Multi-condition logic
- Relation-based access control
- Time-based restrictions
- Field-level permissions

See `references/patterns.md` for comprehensive examples.

## Understanding `?=` and Collection Queries

The `?=` operator is fundamental to PocketBase rules when checking permissions across collections.

### How `?=` Works

**Definition:** Checks if any record in a collection matches the specified condition.

```javascript
@collection.permissions.userId ?= @request.auth.id
```

Translates to: "Does there exist at least one record in the `permissions` collection where `userId` equals the authenticated user's ID?"

### Chaining Multiple Conditions

When you chain multiple `?=` conditions with `&&`, PocketBase looks for **one record** that satisfies **all conditions**:

```javascript
@collection.organisationPermissions.userId ?= @request.auth.id &&
@collection.organisationPermissions.organisationId ?= organisationId &&
@collection.organisationPermissions.role ?= "admin"
```

**This means:** "Find at least one record in `organisationPermissions` where:

- `userId` matches the authenticated user
- AND `organisationId` matches the current record's organisation
- AND `role` equals 'admin'"

**SQL equivalent:**

```sql
EXISTS (
  SELECT 1 FROM organisationPermissions
  WHERE userId = :auth_user_id
  AND organisationId = :record_organisationId
  AND role = 'admin'
)
```

### Cross-Collection Joins (Multi-Hop Relations)

PocketBase supports referencing the result of one `@collection.*` query as the right-hand side of another. This allows rules to traverse a chain of relations across multiple collections.

```javascript
@collection.parentCollection.id ?= parentId &&
@collection.grandparentCollection.id ?= @collection.parentCollection.grandparentId &&
@collection.grandparentCollection.userId ?= @request.auth.id
```

**How to read this:**

1. Find a record in `parentCollection` where `id` matches the current record's `parentId`
2. Find a record in `grandparentCollection` where `id` matches the `grandparentId` from the record found in step 1
3. Confirm that `grandparentCollection` record's `userId` matches the authenticated user

**SQL equivalent:**

```sql
JOIN parentCollection p ON p.id = t.parentId
JOIN grandparentCollection gp ON gp.id = p.grandparentId
WHERE gp.userId = :auth_user_id
```

**Key point:** The right-hand side of `?=` can be `@collection.someCollection.someField`, not just a literal value or current record field. This is what makes multi-hop joins possible.

### Why Not Use `=`?

```javascript
// ❌ DON'T DO THIS
@collection.permissions.role = "admin"
```

This is unreliable because:

- `@collection.permissions.role` represents a collection query result, not a single value
- The `=` operator expects a single value comparison
- Behavior is undefined and won't work as expected

**Always use `?=` with `@collection.*` queries.**

### Field Reference Rules

Field names in rules work differently depending on context:

**In createRule:**

```javascript
organisationId; // refers to the value being submitted in the create request
```

**In updateRule/viewRule/deleteRule/listRule:**

```javascript
organisationId; // refers to the existing record's field
```

**The syntax is identical** - PocketBase automatically understands the context.

**Example that works in ALL rule types:**

```javascript
@request.auth.id != "" &&
@collection.organisationPermissions.userId ?= @request.auth.id &&
@collection.organisationPermissions.organisationId ?= organisationId &&
@collection.organisationPermissions.role ?= "admin"
```

## Common Pitfalls

- **Forgetting authentication check:** Rules without `@request.auth.id != ""` allow unauthenticated access
- **Operator precedence:** `&&` binds tighter than `||`. While `a || b && c` works as `a || (b && c)`, explicit parentheses improve clarity: `a || (b && c)`
- **Using `=` instead of `?=` with `@collection.*`:** Always use `?=` when querying collections. Using `=` is unreliable and won't work as expected
- **Incorrect field syntax:** Use field names directly (e.g., `organisationId`), not `@request.data.organisationId`
- **List vs View rules:** listRule returns empty array on failure (200), viewRule returns 404
- **Update/delete on own records:** Remember to check ownership: `@request.auth.id = userId`
- **Case sensitivity:** Field names are case-sensitive
- **Multiple conditions on collections:** When chaining `&&` with `@collection.*` queries, all conditions must be satisfied by at least one record
- **Multi-hop joins:** When traversing relations across collections, each hop must be resolved explicitly with its own `@collection.*` line. There is no automatic dot-notation traversal across collections.

## Response Behaviors

Understanding how PocketBase responds to rule violations:

- **listRule violations** → 200 OK with empty results `[]`
- **viewRule violations** → 404 Not Found
- **updateRule violations** → 404 Not Found
- **deleteRule violations** → 404 Not Found
- **createRule violations** → 400 Bad Request
- **Locked rules (null) with non-superuser** → 403 Forbidden
