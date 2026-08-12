# 2026 Content Calendar

A shared content calendar for planning, assigning and tracking work across
brands. Month / week / day views, drag-and-drop scheduling, per-month goals,
attachments, filters and analytics — with real accounts, live sync between
everyone in the workspace, and roles enforced by security rules.

This is a port of the single-file prototype in `reference/reference.html` onto
Next.js and Firebase. The look and the interactions are carried over as-is; what
changed is everything underneath.

**[SETUP.md](./SETUP.md) has the setup walkthrough.**

## Stack

- **Next.js 15** (App Router) and React 19, TypeScript
- **Firebase Auth** — email link, passwordless
- **Firestore** — `onSnapshot` throughout, so every view is live
- **Firebase Storage** — attachments
- Deploys to Vercel or Netlify; rules deploy with `firebase deploy`

## Data model

```
users/{uid}                                  name, email, avatar colour, lastWorkspaceId

workspaces/{workspaceId}                     name, createdAt, createdBy
  members/{memberId}                         name, email, colour, role, seat
  items/{itemId}                             title, date, brandId, assignee, type,
                                             deadline, status, references, notes,
                                             files[], order, createdBy, timestamps
  brands/{brandId}                           name, colour
  goals/{YYYY-MM}                            html
  presence/{uid}                             heartbeat + which item is open

invites/{token}                              workspaceId, role, expiresAt,
                                             singleUse, usedBy[], revoked
```

Attachments live at `workspaces/{wid}/items/{itemId}/{id}-{filename}` in
Storage; the item document holds the metadata and the download URL.

### Members and roster seats

The prototype had a fixed seven-person list. Here a member document is either a
real signed-in user (document id is their `uid`) or an **unclaimed roster seat**
created when the workspace was seeded. Seats are assignable immediately, so work
can be planned against someone before they have an account, but they grant
nobody access — the rules only ever look up a document keyed by
`request.auth.uid`. When the real person joins, **Settings → Team roster → This
is me** moves their assigned items across and retires the seat.

New workspaces are seeded with the reference file's roster (Sahil, Rishi,
Vedanjay, Ishwar, Anusha, Dia, Pranay) and its eight default brands. All of it
is editable per workspace.

## Roles

`viewer` reads. `editor` reads and changes content, brands and goals. `admin`
does everything plus members, roles and invites. Enforced in `firestore.rules`
and `storage.rules` — the UI hides what you cannot do, but the rules are the
boundary.

```bash
npm run test:rules
```

47 assertions against the Firestore emulator: cross-workspace isolation, viewer
read-only, editor limits, admin powers, invite redemption at exactly the
invited role, expired and single-use invites, the workspace-creation batch, and
the collection-group query that backs the workspace picker.

## Components

| | |
|---|---|
| `CalendarApp` | state, view switching, drag-and-drop, overlay routing |
| `CalendarGrid` / `WeekView` / `DayView` | the three calendar views |
| `Tile` | a content tile, draggable |
| `ContentDrawer` | full item editor, status pipeline, attachments |
| `CreateModal` / `DayModal` / `AddBrandModal` | creation flows |
| `GoalsEditor` | per-month rich text, auto-saved |
| `FiltersPanel` / `AnalyticsPanel` / `NotificationsPanel` | brand, assignee, status, type, date-range filters; totals and breakdowns; deadline alerts |
| `ShareModal` / `MembersSettings` | invite links, members, roles |
| `RichTextEditor` / `Lightbox` / `Toasts` / `Overlay` | shared primitives |

Drag-and-drop uses the native HTML5 drag events, ported directly from the
reference rather than swapped for a library — the behaviour is identical and it
adds no dependency.

## Differences from the reference file

Small, deliberate, and worth knowing about:

- **The header `Save` button is gone.** It flushed `localStorage`. Every change
  now writes to Firestore as you make it, so the button had nothing left to do.
  The drawer's own **Save** is unchanged.
- **Assignees are member ids, not fixed keys.** See roster seats above.
- **Attachments upload to Storage** instead of becoming blob/data URLs, so they
  survive reloads and are visible to the whole team. Same accepted types, same
  preview and lightbox behaviour, 25 MB per file.
- **Notes and goals are sanitised through an allowlist** rather than the
  prototype's regex strip. Rich text written by one member renders in everyone
  else's browser, which makes it a stored-XSS surface worth closing properly.
- **View, current date and filters are per-user**, kept in `localStorage`.
  Content, brands, goals and members are shared.
- **Presence**: avatars of whoever else is connected, and a note in the drawer
  when someone else has the same item open.

Email invitations are not included — invite links cover sharing, and no mail
provider is wired up.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run test:rules   # security rules against the Firestore emulator
```
