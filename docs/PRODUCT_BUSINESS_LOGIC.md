# Daily Love For Jesus — Product and Business Logic

## Purpose

Daily Love For Jesus is a public-first Christian reading and fellowship platform. A visitor must be able to discover and consume public spiritual content before being asked to create an account. Authentication unlocks personalisation and private activity; it does not gate the Bible, public devotionals, public hymns, public calendar information, or public Telegram devotional content.

## 1. Identity and access principles

- Supabase Auth is the identity provider and source of truth for authentication.
- The application database (Neon) stores the profile, preferences, memberships, activity and application roles.
- A verified Supabase identity is mapped to one application profile by immutable Supabase user UUID.
- New profiles receive the least-privileged role: `user`.
- User-editable metadata (name, avatar, email, browser storage, request body and URL parameters) is never authoritative for roles or permissions.
- Role assignment and promotion are server-side administrative operations with audit records and explicit authorization.
- Public content access is independent of authentication. Public does not mean public write access.
- The UI can hide controls for convenience, but every protected API operation must enforce authorization on the server.

## 2. Visitor-to-member journey

### A. First visit (anonymous)

1. Visitor opens the site; the application creates an anonymous, random session identifier where consent and local law permit.
2. The public navigation is available immediately: Today, Bible, Devotionals, Hymns, Community overview, public calendar and public Telegram devotional feed (where configured).
3. Public read endpoints return only published/public records.
4. Anonymous events may record a pseudonymous session ID, page, timestamp, coarse device/user-agent data and referrer. Avoid retaining raw IP addresses by default; if abuse prevention requires IP processing, minimise, restrict access, document purpose and retention, and comply with privacy obligations.
5. Visitor can continue without an account. No anonymous session is treated as a user identity or assigned a role.

### B. Sign-up

1. Visitor chooses Create account and submits validated name, email and password.
2. Client calls Supabase Auth sign-up; passwords are never stored in Neon or application logs.
3. Supabase applies password policy, rate limits and email verification policy.
4. If verification is required, show a clear “check your email” state and do not treat an unverified/no-session response as signed in.
5. After a verified session exists, backend verifies the access token with Supabase (or validates its signature, issuer, audience and expiry using trusted JWKS configuration).
6. Backend creates a profile keyed by Supabase UUID using a database transaction/upsert. The only permitted initial role is `user`.
7. Existing profile role is preserved; authentication/profile refresh must never overwrite an existing role.
8. User is taken to the application with a welcome tour and a clear navigation guide.

### C. Sign-in and session restoration

1. User submits email/password to Supabase Auth.
2. Supabase returns a session; client stores it using the platform's secure session storage and refreshes it through the supported SDK.
3. Backend verifies every bearer token/session; invalid, expired, malformed or unverifiable tokens are rejected for protected routes.
4. Backend loads the profile by verified Supabase UUID. Missing profile may be provisioned with role `user`, never an elevated role.
5. On app restart, client restores the Supabase session and revalidates it. A failed refresh clears local session state and returns the user to public browsing.
6. Sign-out revokes/clears the session and private client cache. Public browsing remains available.

### D. First-time onboarding and navigation

- Show a short, skippable, four-step guide after the first successful sign-in for each account.
- Explain Today, Bible, Devotionals/Hymns, and personal account features.
- Offer a persistent Explore/navigation panel so the guide can be reopened at any time.
- Navigation must be role-aware for presentation only: public links are visible to everyone; personal links appear when signed in; admin links appear only for authorized roles.
- Do not imply that a hidden link is a security control. Server-side guards remain mandatory.
- Persist tour completion per account in browser storage only as a UX preference, never as an authorization signal.

### E. Normal app usage

Public reads:
- Bible, published devotional content, published hymns, public calendar/events and public Telegram content.
- Public content endpoints filter by publication state and visibility on the server.

Authenticated personal actions:
- Save/remove favourites.
- Save reading progress and history.
- Maintain profile and notification preferences.
- Create private reflections and personal notes.
- Register for or join groups where permitted.

Group and community actions:
- Membership is checked against the requested group/community on every operation.
- Teachers can manage only groups to which they are actively assigned.
- Community owners/admins can manage only their own community.
- Global application roles do not silently grant unrelated group ownership.

Administrative actions:
- Content creation/publishing and user management require explicit role policies.
- Elevated administrators receive only the capabilities defined for that role.
- Superadmin-only actions require a distinct superadmin permission; an `admin` string comparison must not accidentally grant every privilege.
- Every sensitive mutation records actor, action, target, timestamp and safe metadata in an append-only audit trail.

### F. Account deletion

1. User starts deletion from Settings and must re-authenticate or complete a recent-authentication check.
2. Show the consequences, including deletion of profile, favourites, reading history, reflections, push tokens and other user-owned records; explain any legally required retention.
3. Require explicit confirmation (for example, typing DELETE) and record the request.
4. Server verifies the caller owns the account; never accept a target user ID from the client as authority.
5. Mark account as deletion-pending and block new authenticated writes.
6. Revoke Supabase sessions and delete the Supabase Auth identity through a server-side privileged operation.
7. Delete or anonymise user-owned Neon records in a transaction, following documented retention and foreign-key rules. Preserve only records that must legally/security-wise be retained, with personal identifiers removed where possible.
8. Delete user-owned storage objects and push tokens.
9. Record a minimal deletion audit event without retaining unnecessary personal data.
10. Confirm completion and clear local tokens, caches and persisted personal state. Provide a support path for partial failures and retries.

Deletion must be idempotent: retrying a partially completed deletion must safely continue rather than restore the account.

## 3. Permission matrix

| Capability | Anonymous visitor | Signed-in user | Group teacher | Community admin | Admin | Superadmin |
|---|---:|---:|---:|---:|---:|---:|
| Read published public content | Yes | Yes | Yes | Yes | Yes | Yes |
| Read private account data | No | Own only | Own only | Own only | Explicit audited support only | Explicit audited support only |
| Save own reading progress/favourites | No | Yes | Yes | Yes | Yes | Yes |
| Manage assigned group | No | No | Assigned groups only | Only if separately assigned | Policy-defined | Yes |
| Manage own community | No | No | No | Own community only | Policy-defined | Yes |
| Publish platform content | No | No | No | No | Policy-defined | Yes |
| Assign/promote global roles | No | No | No | No | No by default | Yes |
| Change system security settings | No | No | No | No | No by default | Yes |

Role hierarchy is not a substitute for scoped permissions. Prefer explicit capabilities and resource ownership checks over broad “admin bypass” rules.

## 4. API protection rules

- Public procedures: read-only, published/public datasets only.
- Authenticated procedures: require a verified user identity.
- Owner procedures: additionally constrain every query/mutation by `userId = authenticatedUser.id`.
- Group procedures: require active membership and the required group-scoped role.
- Community procedures: require active membership and community-scoped role.
- Admin procedures: require an explicit allow-list of capabilities.
- Superadmin procedures: require a separate immutable permission granted through a controlled process.
- Sync, migration, diagnostics and maintenance endpoints: private network/service identity or a dedicated service credential; a bearer token's mere presence is not authorization.
- Production must fail closed if auth or database configuration is missing. Never create a synthetic developer admin in production.
- Validate inputs with schemas, constrain pagination, rate-limit authentication and sensitive operations, and avoid leaking tokens or personal data in logs.

## 5. Data ownership

Supabase:
- Auth identities, credentials, sessions, email verification and password reset.
- Storage objects where Supabase Storage is selected.

Neon:
- User profile keyed to Supabase UUID.
- Roles/permissions and role-change audit trail.
- Devotionals, content metadata, groups, communities, memberships, calendar/events, activity and application data.

Do not implement uncontrolled bidirectional replication of independently writable records. Pick one authoritative owner per table and use an explicit, observable outbox/event or one-way replication process where a copy is genuinely required.

## 6. Product experience and delight

- Keep the public experience useful before registration; avoid forced sign-up walls for Scripture and public devotional reading.
- Use plain-language labels, visible reading progress, responsive navigation and helpful empty states.
- Ask for registration at the moment it adds value (save a verse, sync progress, join a group), not before the visitor can understand the product.
- Show clear success/failure states for sign-in, verification, password reset, save, join, logout and deletion.
- Provide accessible keyboard navigation, focus management, readable contrast and mobile-friendly controls.
- Let users reopen the getting-started guide from the Explore panel.
- Do not fabricate activity or streaks. Explain when data is unavailable or not yet synced.

## 7. Required acceptance tests

1. Anonymous visitor can read every published public content category.
2. Anonymous visitor cannot read private reflections, account data or unpublished drafts.
3. Signup creates exactly one profile with role `user`.
4. Repeated login/profile sync preserves existing role.
5. Invalid/expired JWT receives 401 on protected endpoints.
6. Changing user ID in body/path cannot read or mutate another user's records.
7. A user cannot assign or promote roles, even by editing metadata or local storage.
8. Teacher can manage assigned group but not another group.
9. Community admin cannot manage another community.
10. Admin cannot invoke superadmin-only operations.
11. Sync endpoints reject requests without verified service/admin authorization.
12. Logout invalidates local session and clears private caches.
13. Account deletion removes/anonymises owned data and is safe to retry.
14. First successful sign-in triggers onboarding once per account; the Explore panel can reopen it.
15. Public navigation remains available after logout and when auth service is unavailable.

## 8. Devotional publishing and Telegram ingestion

- The public product has one Devotionals destination. Telegram is an import channel managed inside the devotional administration workflow; it is not a separate public content area.
- The preferred ingestion path is the Telegram webhook. It must validate the configured webhook secret and configured channel ID/username before accepting a post. In non-serverless deployments, polling is a fallback only when webhook mode is not configured.
- Every imported Telegram message is stored and parsed into an unpublished draft. Parsing success is not publication approval.
- Only server-verified `admin` or `elevated_admin` users may review, edit, publish, unpublish, delete, or send devotional content to Telegram. The API derives permissions from the persisted application user role, never from client state or editable user metadata.
- Public list, today, and detail reads return published devotionals only. Draft listing is a distinct elevated procedure.
- Publishing updates the public devotional feed and emits a Realtime invalidation event. The event contains only an ID and action; it does not disclose devotional text or draft data.
- Sending to Telegram is a separate explicit operation, requires the devotional to be published, and must surface missing configuration or Telegram API errors as failures.
- The Supabase Realtime channel currently carries refresh signals only. The main application data store is Neon, so database-level RLS policies for application tables must be verified against the actual production database separately from API RBAC.
