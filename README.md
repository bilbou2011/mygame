# Moonforge Atelier

Made with love by **Moonforge Atelier**.

This build adds persistent health, chase AI, healing power cores, a wardrobe shop, fullscreen, settings, bug reports, and a new ad game: `rift_runner.html`.

Run `supabase/schema.sql` in your Supabase SQL editor, fill in `config.js`, then serve the folder with a local static server. The frontend never contains a Supabase service-role key.

The bug form writes to `bug_reports`; it does not send email by itself. To receive email notifications, add a Supabase Edge Function or an external email service such as Resend—never expose that provider's secret in browser JavaScript.
