# PlayNext

PlayNext is a context-aware game decision-support application. It helps a user choose one game that fits the session they have right now instead of presenting another endless catalogue. A user can ask for a recommendation from games they own or discover something outside their collection.

The AI has one bounded responsibility: converting conversation into structured intent such as mood, available time, energy, desired experience and exclusions. A deterministic recommendation engine then ranks eligible games using that live context together with saved preferences, decaying feedback, recommendation history and game-quality signals. The separation makes decisions repeatable, testable and explainable.

## Main features

- Supabase email/password and Google OAuth authentication, including account recovery
- guided onboarding for genres, platforms and an initial game collection
- visual RAWG catalogue with search, categories and game-detail pages
- collection management with filtering, sorting and pagination
- conversational intent extraction with persistent in-progress decisions
- collection and discovery recommendation modes
- explainable scoring, recommendation history and feedback learning
- calibrated decision confidence and targeted clarification when leading matches are too close
- editable personal preferences, display name and account settings
- responsive desktop, tablet and mobile layouts

## Technology

- **Next.js 16 App Router and React 19** for the full-stack web application
- **TypeScript** for typed application and domain logic
- **Supabase** for authentication, PostgreSQL data and Row Level Security
- **Gemini** for constrained intent extraction, with deterministic local fallback
- **RAWG API** for game catalogue metadata and artwork
- **Tailwind CSS and product CSS layers** for the responsive interface
- **Node test runner, ESLint and TypeScript** for the verification gate

## Recommendation flow

1. The signed-in user selects their collection or discovery as the candidate source.
2. Their conversation is interpreted into a bounded `ExtractedIntent` object.
3. The server retrieves the relevant candidates and the user's saved signals.
4. The deterministic engine applies hard eligibility rules, scores multiple weighted factors, reliability-weights public ratings, deduplicates candidates and ranks the result.
5. If evidence is weak and leading candidates are close, PlayNext asks one targeted clarification instead of forcing a winner.
6. PlayNext stores the recommendation and shows the leading reasons, score breakdown, decision confidence and lead over the next eligible match.
7. Feedback becomes a time-decaying similarity signal for later decisions; it does not permanently exclude a game unless the current request requires that exclusion.

## Local setup

Requirements: Node.js 20 or later, npm and a Supabase project.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Configure these variables in `.env.local`; never commit their real values:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RAWG_API_KEY=
GEMINI_API_KEY=
```

For a **new empty Supabase project only**, run `supabase/bootstrap/000_initial_schema.sql`, then apply the SQL files in `supabase/migrations` chronologically. Do not run the bootstrap file against the existing production project; its tables already exist. Existing projects should apply only outstanding timestamped migrations.

Run `supabase/tests/rls_verification.sql` in the SQL editor after migrations. Every invalid-row count should be zero, every listed constraint should be validated, RLS should be enabled for all personal tables, and table privileges should match the documented least-privilege set.

## Verification

```bash
npm run verify
```

This runs the complete automated test suite, ESLint and a no-output TypeScript compile. Recommendation-only, benchmark and security-focused subsets are available through `npm run test:engine`, `npm run test:evaluation` and `npm run test:security`.

`tests/liveRls.test.mts` is skipped unless two dedicated test accounts are supplied through the `PLAYNEXT_TEST_USER_A_*` and `PLAYNEXT_TEST_USER_B_*` environment variables. Those accounts allow a read-only, cross-user isolation check against the real Supabase project without embedding credentials in source control.

The reproducible manual test procedure and requirements traceability are in:

- `docs/TESTING_AND_EVALUATION.md`
- `docs/MANUAL_QA_CHECKLIST.md`
- `docs/RECOMMENDATION_ENGINE.md`
- `docs/USABILITY_EVALUATION_PROTOCOL.md`
- `docs/REAL_WORLD_EVIDENCE_PLAN.md`

## Security and privacy

- protected API routes validate the caller's Supabase access token
- RAWG and Gemini secrets remain server-only
- Row Level Security isolates user-owned data
- database grants are revoked and rebuilt to the minimum required operations
- bounded constraints reject invalid statuses, feedback values, score ranges and unreasonable session values
- redirect destinations are restricted to safe internal application paths
- the interface uses a native system font stack, avoiding a build-time or first-load dependency on a third-party font host

Do not store screenshots containing passwords, tokens, API keys or personally identifying participant data. Any formal evaluation involving human participants must follow the university ethics process before recruitment or data collection.

## Current evaluation boundaries

The automated benchmark demonstrates agreement with a transparent developer-authored scenario set; it is not a universal accuracy claim. Full external validation still requires authenticated device testing, cross-user testing with dedicated accounts and ethically approved usability evaluation. These limitations are recorded explicitly so the artefact is not presented more strongly than the available evidence supports.

Game metadata and artwork are provided by RAWG.
