# Setup

From an empty Firebase project to a running calendar in about ten minutes.

## 1. Create the Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) and **Add project**.
2. Google Analytics is not used — turn it off if you like.

## 2. Enable email link sign-in

**Build → Authentication → Get started → Sign-in method**

1. Enable **Email/Password**.
2. Inside it, also switch on **Email link (passwordless sign-in)**. Both toggles
   need to be on — the second one is what this app uses.
3. Under **Authentication → Settings → Authorized domains**, add every domain the
   app runs on: `localhost` is there by default; add your Vercel or Netlify
   domain once you deploy. A missing entry here is the usual cause of
   `auth/unauthorized-continue-uri` when requesting a sign-in link.

## 3. Create Firestore and Storage

- **Build → Firestore Database → Create database.** Pick a region close to the
  team. Start in production mode — the rules in this repo replace the defaults.
- **Build → Storage → Get started.** Same region.

## 4. Copy the config into `.env.local`

**Project settings → General → Your apps → Web app** (create one if there is
none). Copy the config values across:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…
NEXT_PUBLIC_FIREBASE_APP_ID=…
```

These are `NEXT_PUBLIC_` on purpose: Firebase web config is not a secret. Access
is controlled by the security rules, not by hiding the config.

## 5. Deploy the security rules

This is not optional. Until the rules are deployed, Firestore's default rules
apply and the role model is not enforced.

```bash
npm install -g firebase-tools     # if you do not have it
firebase login
firebase use --add                # pick the project you just created
firebase deploy --only firestore:rules,firestore:indexes,storage
```

`firestore.indexes.json` carries a collection-group index on `members.uid`. It
is what makes "which workspaces am I in?" work, so deploy the indexes as well as
the rules.

## 6. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000, enter your email, open the link that arrives, and
create your first workspace. You become its admin, and it is seeded with the
default brands and the seven-name roster.

---

## Inviting the team

**Share** in the header, or **Settings → Invite links**. Pick a role, an expiry
and whether the link is single use, then send the link. Whoever opens it signs
in and lands in the calendar at the role you chose. There is no email sending in
this build — you pass the link along yourself.

## Roles

| | Viewer | Editor | Admin |
|---|---|---|---|
| Read the calendar | ✅ | ✅ | ✅ |
| Create / edit / delete content | | ✅ | ✅ |
| Manage brands and monthly goals | | ✅ | ✅ |
| Upload and remove attachments | | ✅ | ✅ |
| Manage members and roles | | | ✅ |
| Create and revoke invite links | | | ✅ |
| Rename or delete the workspace | | | ✅ |

Enforced in `firestore.rules` and `storage.rules`, not just in the UI. Hiding a
button is a convenience; the rules are the actual boundary.

## Testing the rules

```bash
npm run test:rules
```

Boots the Firestore emulator and runs 47 assertions covering read isolation
between workspaces, viewer read-only, editor limits, admin powers, invite
redemption at the correct role, expired and spent invites, workspace bootstrap
and the collection-group query. Requires Java (the emulator is a JVM process).

---

## Local development against the emulators

Optional, and useful when you would rather not touch the real project.

```bash
firebase emulators:start --only firestore,auth,storage
```

Then add to `.env.local`:

```
NEXT_PUBLIC_USE_EMULATORS=1
```

The app connects to the emulator suite instead of your project. Sign-in links
are printed in the emulator UI at http://127.0.0.1:4000/auth rather than
emailed.

### One caveat: attachments against the emulator

`storage.rules` checks workspace membership with a cross-service Firestore
lookup (`firestore.exists`). The Storage **emulator** does not provide that
binding — `firestore` evaluates to null there, and every upload comes back 403
even though the identical ruleset compiles cleanly and works against a real
Firebase project.

If you need to exercise attachments locally, point `firebase.json` at the
emulator variant:

```json
"storage": { "rules": "storage.emulator.rules" }
```

It keeps the path shape, the 25 MB cap and the accepted content types, and drops
only the membership check. **Switch it back to `storage.rules` before
deploying.** Membership enforcement itself is covered by `npm run test:rules`
against Firestore.

---

## Deploying

### Vercel

1. Import the repository.
2. Add the six `NEXT_PUBLIC_FIREBASE_*` variables under **Settings →
   Environment Variables**.
3. Deploy, then add the deployed domain to Firebase **Authentication → Settings
   → Authorized domains**.

### Netlify

Same, plus `@netlify/plugin-nextjs` (Netlify adds it automatically for Next.js).
Build command `npm run build`.

Rules deploy separately from the app — `firebase deploy --only
firestore:rules,storage` whenever you change them.

## Troubleshooting

**`auth/unauthorized-continue-uri`** — the domain is missing from Firebase
Authentication → Settings → Authorized domains.

**`auth/operation-not-allowed`** — the *Email link (passwordless sign-in)*
toggle inside the Email/Password provider is still off.

**"Missing or insufficient permissions"** — the rules have not been deployed, or
you are signed in as someone who is not a member of that workspace.

**Sign-in link opens and asks for your email again** — you opened it in a
different browser from the one that requested it. Firebase needs the address
back to complete the exchange; entering it finishes the sign-in.

**The workspace list is empty but you know you are a member** — the
collection-group index has not been deployed. `firebase deploy --only
firestore:indexes`.
