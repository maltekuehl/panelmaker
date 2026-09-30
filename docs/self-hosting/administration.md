# Administration

## Accounts and roles

Every account has a site role, `USER` or `ADMIN`, and a status, `ACTIVE` or `BLOCKED`.

Anyone who can reach the instance can sign up with email and password, or with GitHub if it is configured. There is no invitation-only mode and no email verification. To restrict who can reach the instance at all, use network controls or the [basic auth gate](./deployment.md#the-basic-auth-gate).

Any signed-in, non-blocked user can submit reports, design panels and create labs.

## Admin accounts

Admins are created from the command line, not in the web interface:

```bash
# Docker
docker compose run --rm migrate npm run admin:create -- --email admin@example.edu --name "Ada Admin"

# bare metal
npm run admin:create -- --email admin@example.edu --name "Ada Admin"
```

- For a new email, this creates an active `ADMIN` account and prints a generated password once.
- For an existing account, it sets the role to `ADMIN` and the status to `ACTIVE` and keeps the password.
- `--reset-password` generates a new password for an existing account. `ADMIN_PASSWORD` sets a chosen one (12 to 128 characters).

There is no command or page to turn an admin back into a regular user. Do it in the database:

```sql
UPDATE "User" SET role = 'USER' WHERE email = 'former-admin@example.edu';
```

Admin accounts cannot be blocked or deleted from the admin pages, and admins cannot delete their own account from Settings.

## Passwords

PanelMaker does not send email, so there is no self-service password reset. `admin:create --reset-password` resets a password but also makes the account an admin, so it is not suitable for regular users. A user who has lost their password needs a new account, or an operator who sets a new bcrypt hash in the `User.password` column directly.

## The admin area

Signed-in admins see an admin link in the user menu. The area at `/admin` has three pages.

### User management

`/admin/user` lists all accounts with search and paging. For each non-admin account an admin can:

- **Block**: the user cannot sign in, and existing sessions stop working on their next request. Their content stays.
- **Unblock**: restores access.
- **Delete**: removes the account and its data. This cannot be undone.

Block and unblock actions are recorded as security events.

### Report review

The review page is `/admin/reports`. New validation reports start in the `PENDING` state. A report is visible to the public only when it is `PUBLISHED` and its experiment's visibility is `PUBLIC`. Private and lab reports are visible to their owner and lab members whatever their state.

The page lists every pending report, newest first. An admin can:

- **Approve**: sets the report to `PUBLISHED`. If the experiment is public, it appears in browse and search.
- **Dismiss**: sets the report to `REJECTED`. It stays visible to its submitter and their lab according to the experiment's visibility, but never publicly.

The list is not filtered by visibility, so admins also see pending reports from private and lab experiments. Approving one of those does not make it public while its experiment stays private or lab-only.

Reports imported with `npm run ibex:import` are created as `PUBLISHED` and skip this queue.

### Statistics

`/admin/stats` shows AI assistant usage for the last 7, 30 and 365 days: number of chat messages, number of distinct users, and calls and tokens per model. Use it together with the provider consoles to watch the cost of instance keys. See [AI assistant](./ai-assistant.md#cost-and-limits).

## Labs

Labs are research groups inside the instance. Any user can create one and becomes its owner. Membership roles, from most to least privileged:

| Role     | Can                                                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OWNER`  | Everything an admin can, plus delete the lab                                                                                                       |
| `ADMIN`  | Edit lab settings, invite and remove members, change roles below owner, manage the lab's AI keys, edit any experiment or panel shared with the lab |
| `MEMBER` | Add and edit inventory, create experiments and panels in the lab, edit their own shared work                                                       |
| `VIEWER` | Read lab content                                                                                                                                   |

Members join through invitation links created on the lab's members page. Lab AI keys are managed at `/labs/<slug>/settings#ai-keys`; see [AI assistant](./ai-assistant.md).

Site admins have no special rights inside labs they do not belong to. Lab ownership problems, such as an owner who has left the institution, have to be fixed in the database (`LabMembership.role`).

## Leaderboard

The Community page (`/leaderboard`) ranks contributors on this instance only. It never includes data from other instances.

## Data export

Each user can download their own data as JSON from their settings (`GET /api/user/export`).
