# Constellation Loom — Supabase Edition

This branch is set up as a real Supabase-authenticated browser game prototype.

## What this gives you

- Real email/password auth via Supabase
- Secure user sessions
- User profile creation
- Database-backed progress saves
- Admin visibility tied to a DB role
- Fullscreen button and save state

## Setup steps

1. Create a Supabase project in the Supabase dashboard.
2. Open the SQL editor and run the contents of `supabase/schema.sql`.
3. Go to Authentication > Providers and enable Email.
4. Update `config.js` with your Supabase project URL and public anon key.
5. Start a local static server and open the page.

Example:

```js
window.__SUPABASE_CONFIG__ = {
  url: 'https://xyzcompany.supabase.co',
  anonKey: 'public-anon-key-from-project-settings'
};
```

## Run locally

Use a static local server so browser auth works properly:

```bash
python -m http.server 8000
```

Then open:

http://localhost:8000

## Important note

This is a real frontend auth flow, but it is still a browser game frontend. It does not include server-side secrets in the browser, and it avoids hardcoding private keys.

For true production, add:

- email confirmation workflow
- password reset flow
- protected admin routes
- richer game save data
- deployment to a real static host or custom server

## Admin role

After signup, an admin can be granted from SQL:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Then the owner panel will unlock in the app.

## Files

- `index.html` — login and game shell
- `game.js` — gameplay loop and canvas rendering
- `app.js` — Supabase auth flow, profile loading, and save syncing
- `config.js` — Supabase config placeholder
- `supabase/schema.sql` — database tables and policies
