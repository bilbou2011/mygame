# Constellation Loom — putting the pieces together

You do **not** manually combine these files. Keep every file in the same extracted folder, preserving the folders:

- `index.html`
- `style.css`
- `game.js`
- `app.js`
- `config.js`
- `quantum_courier.html`
- `Neon_Echo_Real_Website.html`
- `rift_runner.html`
- `assets/eclipse-sigil.svg`
- `supabase/schema.sql`

Then open `index.html`. The ad games work because their HTML files sit beside it. The sigil works because the `assets` folder stays beside `index.html`.

For Supabase, run `supabase/schema.sql`, put your project URL and public anon key into `config.js`, and serve the folder with `python -m http.server 8000`. Do not open a file from inside the ZIP preview.
