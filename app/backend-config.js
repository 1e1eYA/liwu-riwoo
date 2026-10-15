// Public deployment configuration only. Never put a secret/service-role key here.
// Test Supabase is the default. Set mode to 'mock' for explicit local-only use.
export const BACKEND = Object.freeze({
  mode: 'supabase',
  environment: 'test',
  // Test R2 health verified by the project owner; direct upload acceptance follows.
  mediaEnabled: true,
  // Enable only after moderation SQL/functions and server secrets are deployed.
  moderationEnabled: true,
  // Filled automatically by the static build from the deployed API. Allows an
  // initial offline visit to retain the correct environment/batch identity.
  batchId: '02d2e49e-c675-4add-8c92-83c96d0b77e0',
  supabaseUrl: 'https://ynsnmopdqbkgtuuputdw.supabase.co',
  publishableKey: 'sb_publishable_fMZdDjE4429Q6TcAUjsWcw_HCdbn0_F',
});
