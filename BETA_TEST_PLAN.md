# Daily Love for Jesus — Beta Test Plan

## Beta environment safety

Do not use the preview deployment for mass-notification tests or destructive data tests until its database and Supabase Auth configuration are confirmed to be isolated from production.

The Vercel project currently has environment variables targeted at both Preview and Production. A Preview target does not by itself prove that the underlying database or Supabase project is a staging instance.

Before inviting external testers:
- Configure a dedicated staging Neon database and Supabase project (or a clearly isolated staging branch and auth tenant).
- Set Preview environment variables to the staging endpoints and keys.
- Keep production credentials out of preview overrides.
- Confirm the API's resolved database target using a non-sensitive environment fingerprint or read-only health check.
- Use test-only Telegram credentials and a test channel.
- Use test Expo devices/tokens only.

Never paste secrets into issues, PR comments, logs, or this document.

## Test accounts and role matrix

Create separate test accounts; do not change existing real users' roles for testing.

| Account | Platform role | Scoped membership |
| --- | --- | --- |
| Member A | user | Community A member; Group A student |
| Teacher A | user | Community A member; Group A teacher |
| Assistant A | user | Community A member; Group A assistant_teacher |
| Owner A | user | Community A COMMUNITY_OWNER |
| Elevated A | elevated_admin | No automatic community ownership |
| Admin legacy | admin | Verify legacy admin compatibility |
| Superadmin A | superadmin | Platform-level appointment authority |
| Member B | user | Community B member; Group B student |

## Authentication and dashboard checks

1. Sign up a new standard member using the staging Supabase Auth project.
2. Confirm the session is created and the application profile is provisioned in the staging database.
3. Confirm the account's initial platform role is exactly user.
4. Sign out and sign in again; verify the standard /dashboard loads only after the server profile is verified.
5. Confirm a profile lookup failure shows the retry/sign-out screen and does not grant access.
6. Confirm each scoped role receives its dashboard link only after the server returns the relevant active membership.

## Authorization acceptance tests

- A user cannot open /dashboard/elevated-admin or /dashboard/superadmin.
- A teacher can access only groups where their active group membership is teacher or assistant_teacher.
- A teacher from Group A cannot read Group B's roster, attendance, assignments, reports, or announcements through direct API requests.
- Owner A can update Community A, create groups in Community A, and assign teachers only to groups in Community A.
- Owner A cannot update Community B or appoint a teacher in Community B, even when submitting Community B's UUID directly to the API.
- Elevated A can appoint an active Community A member as owner, but cannot promote a platform user to elevated_admin.
- admin and elevated_admin are both rejected by the superadmin-only elevated-admin appointment procedure.
- Only Superadmin A can appoint a standard user as elevated_admin.
- A user cannot promote themselves; accounts already holding privileged platform roles cannot be overwritten by the appointment operation.

## Functional workflows

### Community owner
- Edit community name, description, and location.
- Create a Sunday School group.
- Assign a community member as teacher or assistant teacher.
- Verify the new teacher sees the group in the Sunday School workspace.
- Verify all writes appear in audit logs.

### Sunday School teacher
- Open the assigned group.
- Generate and share the invite code.
- Join a test student account.
- Create a reading assignment and announcement.
- Record attendance and verify the weekly report.
- Confirm student reading activity is scoped to that group.

### Elevated administrator
- Import a devotional from a test Telegram channel or paste a test devotional.
- Review and publish a test devotional.
- Appoint an active member as Community Owner.
- Send an application-wide notification only after verifying the preview database contains test accounts exclusively.
- Verify in-app notification records and Expo delivery receipts.

### Superadmin
- Promote a standard test account to elevated_admin.
- Confirm the operation is audit-logged.
- Confirm the newly elevated account cannot appoint another elevated administrator.

## Release gates

Beta is ready for external testers only when:
- TypeScript, lint, unit tests, Docker build, and production bundle build all pass on the same commit.
- A preview deployment for that exact commit is READY.
- Preview database and Supabase Auth are confirmed isolated from production.
- The authorization acceptance tests pass for each role.
- Signup/profile provisioning is verified end-to-end.
- Notification delivery is tested against test-only recipients.
- No production database migrations, seed writes, broadcasts, or role changes are performed as part of preview testing.

## Current limitations to track

- Browser-level signup-to-dashboard automation is not yet present in the automated suite.
- Role assignment and cross-community isolation need integration tests against a staging database.
- The current community-owner dashboard covers profile editing, group creation, and scoped teacher assignment; advanced community billing, member moderation, and analytics are not implemented here.
- Application-wide notification delivery currently uses the existing Expo push-token infrastructure; delivery must be confirmed through provider receipts and device tests.
