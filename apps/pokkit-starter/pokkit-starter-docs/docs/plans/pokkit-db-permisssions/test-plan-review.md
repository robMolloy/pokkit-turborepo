# Test Plan Review — Pokkit Db Permissions

Review of `test plan2.md` (active matrix plan) and `test plan.mdx` (legacy plan) against `spec.md`.

**Verdict:** Treat `test plan2.md` as the plan under construction for the new matrix-driven spec. It is directionally correct for the `users` rows it covers, but incomplete relative to the users matrix and does not yet cover the rest of `spec.md`. Do not implement new work from `test plan.mdx` without reconciling it to `spec.md` — several cases conflict.

---

## Sources of truth

| Document | Role |
| -------- | ---- |
| `spec.md` | Intended behaviour (users matrix + org/OUP/custom collections) |
| `test plan2.md` | Active test plan being extended toward that matrix |
| `test plan.mdx` | Older, broader plan; partially superseded / conflicting |

Existing automated coverage already maps some legacy IDs (`BOOT-01`–`BOOT-04`, first-user superadmin) but does not implement `PDBP-USERS-*` cases yet.

---

## What `test plan2.md` gets right

1. **Matrix-first structure** — Cases map cleanly to the users permissions matrix columns (Create / View / View Own / Update), same style as the config-sync plan (`PDBCS-*`).
2. **Superadmin status-insensitive access** — Explicit “status not relevant” for Create / View / View Own / Update matches the users matrix (`pending` / `approved` / `blocked` all ✅ for those actions).
3. **Approved-only for admin & standard View** — Pending/blocked admin and standard cannot View / View Own; approved can. Matches the matrix.
4. **Admin/standard cannot Create or Update** — Matches the matrix for non-own and general Update columns.
5. **Behaviour-only wording** — Cases state expected outcomes without prescribing rule strings or hook details.

---

## Gaps in `test plan2.md` vs the users matrix

The matrix defines **11 action columns**. Plan 2 currently covers **4** (Create, View, View Own, Update).

| Matrix column | In plan 2? | Notes |
| ------------- | ---------- | ----- |
| Create | Yes (`02`–`04`) | Good |
| View | Yes (`05`–`09`) | Clarify “any/other user” vs own (below) |
| List | **Missing** | Distinct PocketBase `listRule`; must not be assumed from View |
| Update | Yes (`15`–`17`) | Good for “any record”; Update Own is separate |
| Delete | **Missing** | Superadmin ✅; admin/standard ❌ |
| Create Own | **Missing** | Matrix uses `⊖` for superadmin — define meaning before writing cases |
| View Own | Yes (`10`–`14`) | Good |
| List Own | **Missing** | Same status rules as List/View Own for admin & standard |
| Update Own | **Missing** | Matrix: all roles ❌ (including approved superadmin) |
| Delete Own | **Missing** | Matrix: approved admin/standard ✅; superadmin ❌ — easy to get wrong |

### High-priority missing cases

1. **Update Own / Delete Own** — Counter-intuitive: approved admin/standard may **delete** their own `users` record but not **update** it; superadmin may update/delete **others** but not update/delete **own**. These need explicit cases.
2. **List / List Own** — Same allow/deny shape as View in the matrix, but enforce via list APIs so `listRule` regressions are caught.
3. **Delete (any)** — Superadmin allowed regardless of status; admin/standard denied for all statuses.
4. **Create Own (`⊖`)** — Spec does not define ⊖. Decide: skip / N/A / “auth collection create-own not applicable” and document that in the plan so implementers do not invent behaviour.
5. **Unauthenticated `users` access** — Not in the matrix table, but worth a single deny case for list/view/create/update/delete.
6. **No GUP row** — Authenticated user with no `globalUserPermissions` record: expect same denials as pending/blocked non-superadmin unless the spec says otherwise.

### Clarity improvements for existing cases

1. **`PDBP-USERS-01`** — “Set up correctly” is too vague. Specify: stock auth fields remain; API rules match the matrix (or point at a frozen expected rule fixture).
2. **View vs View Own** — Rephrase View cases as “view **another** user’s record” so they are not redundant with View Own. Same for future List vs List Own.
3. **Status-irrelevant superadmin** — Wording is clear, but require at least one non-`approved` fixture (e.g. pending **and** blocked) per action family so the claim is actually tested, not only approved.
4. **Admin/standard Create & Update** — “Status not relevant” is fine; still worth one approved + one non-approved example so approved elevation cannot sneak in Create/Update rights.
5. **ID continuity** — After Create (`02`–`04`), View starts at `05`, then Update jumps to `15`. Prefer contiguous IDs or reserved ranges per action so later List/Delete/Own rows do not collide.

---

## Conflicts: `test plan.mdx` vs `spec.md`

Do not treat the legacy plan as authoritative for new implementation without edits. Material conflicts:

| Legacy case | Legacy expectation | Spec expectation |
| ----------- | ------------------ | ---------------- |
| `ORG-03` / `ORG-12` | Approved global **admin** can create organisations | Global admin **cannot** CREATE/UPDATE/DELETE organisations |
| `ORG-05`–`07`, `OUP-33` | Org create provisions creator as org admin; tenant CRUD via membership; global admin alone has no cross-tenant control | Spec does not describe admin-driven org create / auto-provision; platform create is superadmin-oriented |
| `GUP-22` / `GUP-23` | Pending/blocked (including superadmin) denied on rules that require approved | `onlyCanCrudIfGlobalSuperadmin` has **no** `status ?= "approved"` and explicitly allows pending/blocked superadmin |
| `GUP-19` / `GUP-20` / setup assumptions | Consumer fixtures generally require approved status | Spec mixes patterns: users matrix is status-insensitive for superadmin; custom superadmin collection omits status; org platform text says **approved** superadmin |
| `GUP-26`–`28` | Own profile via `id = @request.auth.id`; admin **or** superadmin can access others | Users matrix is richer (List/Delete/Own columns) and does not match a simple admin-or-superadmin story for Update/Delete |
| `OUP-09` / `OUP-10` | Member can read own; non-admin cannot manage memberships | Spec: organisation **standard** can CRUD **their own** OUP record |
| Field naming | `orgId` | Custom collection rules use `organisationId` |

Also: `index.mdx` rule templates still require `status ?= "approved"`, which disagrees with the custom `onlyCanCrudIfGlobalSuperadmin` example in `spec.md`. Align docs before locking tests.

---

## Spec areas not yet in `test plan2.md`

Plan 2 only starts the `users` collection. Still needed for full spec coverage:

1. **First user** — First `users` create → approved superadmin GUP (already covered by an existing test; add a `PDBP-*` case or cross-link it).
2. **`globalUserPermissions`** — Schema + who can manage GUP (spec overview / index say only superadmins manage permission collections; legacy plan has a large GUP section worth harvesting after reconciliation).
3. **`organisations`** — Superuser schema check; approved superadmin READ/CRUD; global admin/standard cannot CUD; org admin can UPDATE/DELETE own org; org standard cannot CUD.
4. **`organisationUserPermissions`** — Superadmin CRUD any; global admin/standard cannot; org admin CRUD in-org; org standard CRUD **own** only.
5. **Custom fixture collections** from the spec:
   - `onlyCanCrudIfGlobalSuperadmin` (status **not** required)
   - `onlyCanCrudIfYourOwnRecord`
   - `onlyCanCrudIfUserInOrganisation` (no status in rule as written)
   - `onlyCanCrudIfAdminUserInOrganisation`

---

## Spec ambiguities to resolve before more tests

These are product/spec questions; the test plan should not invent answers:

1. **`⊖` on Create Own** for superadmin — N/A or denied?
2. **Status on org platform rules** — Users matrix: superadmin powers ignore status. Organisations section: “approved superadmin” for READ/CRUD. Pick one policy (or document intentional difference).
3. **Custom org rules omit `status`** — If membership pending/blocked should deny, rules and tests must add it; if not, say so explicitly (legacy plan assumed approved-only).
4. **Relation field name** — `orgId` vs `organisationId`.
5. **Global admin READ on `organisations`** — Spec states CUD denials and superadmin READ; admin READ is unspecified.
6. **Who creates the first organisation** if only superadmin can create — confirm bootstrap story (superadmin creates + optional OUP provisioning).

---

## Recommendations

1. **Keep extending `test plan2.md`** as the single active plan; finish the users matrix (List, Delete, Own columns) before org/OUP/custom sections.
2. **Mark `test plan.mdx` deprecated** (banner at top) or rewrite it against `spec.md` so BOOT/GUP cases that still apply (collections boot, first-user, self-weaken hooks if still required) are not lost.
3. **Add a coverage table** in plan 2: matrix cell → case ID(s), same idea as the legacy “Coverage vs success criteria” section.
4. **Resolve the six spec ambiguities above** in `spec.md`, then mirror them in plan 2 case text.
5. **Align `index.mdx` rule templates** with whichever status policy the custom collections use.
6. When implementing, prefer one case (or small table-driven suite) per matrix cell so “status not relevant” and approved-only rows stay explicit.

---

## Suggested next cases for `test plan2.md` (users only)

1. List + List Own (mirror View / View Own status rules).
2. Delete (any) — superadmin ✅ all statuses; admin/standard ❌ all statuses.
3. Update Own — deny for all roles/statuses in the matrix.
4. Delete Own — deny for superadmin; allow approved admin/standard; deny pending/blocked admin/standard.
5. Create Own — after ⊖ is defined.
6. Unauthenticated deny + missing GUP deny.
7. Tighten `PDBP-USERS-01` and View wording (“another user”).
