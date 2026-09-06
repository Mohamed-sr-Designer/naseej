/* ─────────────────────────────────────────────────────────────
   NASIJ — Firebase configuration
   ─────────────────────────────────────────────────────────────
   HOW TO GO LIVE (one-time, ~5 min):
   1. Go to https://console.firebase.google.com  →  Add project (free "Spark" plan is enough).
   2. Build → Authentication → Get started → enable "Email/Password".
      Then Users → Add user → create your owner login (email + password).
   3. Build → Firestore Database → Create database → Start in "production mode".
   4. Build → Storage → Get started (for product image uploads).
   5. Project settings (gear icon) → "Your apps" → Web app (</>) → register → copy the
      firebaseConfig values into the object below.
   6. Firestore → Rules: paste the rules from the file  firestore.rules  (in this folder).
      Storage → Rules: paste the rules from  storage.rules .
   7. In Firestore, create a document  admins/<YOUR_UID>  with field  role: "super_admin"
      (find your UID in Authentication → Users). This makes you the owner.
   8. Redeploy (git push). Done — the dashboard is now live and global.

   These values are PUBLIC by design (they identify the project in the browser).
   Real security comes from Firebase Auth + the Firestore/Storage rules — NOT from hiding these.
   Leave them blank to keep the site running in local-only (localStorage) demo mode.
──────────────────────────────────────────────────────────────── */
window.NASIJ_FIREBASE = {
  apiKey:            "",
  authDomain:        "",
  projectId:         "",
  storageBucket:     "",
  messagingSenderId: "",
  appId:             ""
};
