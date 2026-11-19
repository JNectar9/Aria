# ARIA (JNectarTech)

1. Create a Supabase project. In SQL Editor, run `supabase/schema.sql`.
2. Auth > Providers: keep Email on. For Google, add your Google OAuth client ID and secret.
3. Auth > URL Configuration: add `http://localhost:3000/auth/callback` and your Vercel URL + `/auth/callback`.
4. `cp .env.example .env.local` and fill in the project URL and anon key.
5. `npm install && npm run dev`, then open http://localhost:3000
6. Deploy: push to GitHub, import in Vercel, add the same two env vars.

Not built yet: the experiment runner. Uploads create a "queued" row; the sandboxed runner will pick them up next.
