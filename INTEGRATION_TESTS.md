# Workout concurrency integration tests

Update package.json and add tests/integration/workout-concurrency.test.ts.
No new packages are needed. No changes to auth.ts or application routes are needed.

Copy integration.env.example to .env.integration.local at the project root and enter
an existing dedicated test account's credentials. Use the same localhost origin as
your application/Auth.js configuration. This first suite permits local HTTP only.
The application uses its normal database: temporary records are written there.
The test reuses a shared catalog exercise, so seed the shared catalog first.
It does not create users or catalog exercises.

Ensure .env.integration.local is ignored before entering secrets:

```bash
cp integration.env.example .env.integration.local
git check-ignore .env.integration.local
```

If check-ignore prints no path, add this exact line to your existing .gitignore:

```gitignore
.env.integration.local
```

Never commit the populated local environment file. The example contains no credentials.
Quote passwords containing # or whitespace according to Node .env syntax.

In terminal A start the app:

```bash
npm run dev
```

In terminal B run:

```bash
npm run check
npm run test:integration
```

The three integration cases are:
- stale save rejection and successful deliberate retry after reloading;
- two simultaneous edits: one 200, one 409, one version increment;
- simultaneous rest start and edit: one 200, one 409, matching final saved state.

The suite verifies a real credentials session using the CSRF flow and its own
cookie jar, independently of your browser. It never prints passwords or cookies.
Each case creates a unique temporary workout, attachment, and set. Cleanup hooks
delete the workout after normal success/failure and verify GET returns 404.
A lost create response triggers an exact-title lookup for that run's UUID only.
Cleanup failures fail the test. Process termination or a server outage can prevent
cleanup; printed temporary workout IDs/unique titles let you remove those fixtures.
Deletion of nested documents is covered by your earlier cascade checks; this
suite checks cleanup through the API rather than directly inspecting MongoDB.

No automatic retry is used for POST creation or racing writes, because retries
could create duplicates or hide a real concurrency failure.
The tests launch writes concurrently, but do not force database scheduling order.
Either request may win. These tests do not test the browser conflict panel,
navigation warnings, OAuth, or second-account authorization yet.

npm test and npm run check remain unit/type/lint checks; integration is explicit.
Only scripts change in package.json, so there is no dependency installation needed.
