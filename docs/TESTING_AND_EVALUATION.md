# PlayNext Testing and Evaluation Record

**Evidence date:** 20 July 2026  
**Scope:** current local technical artefact  
**Verification command:** `npm run verify`

## 1. Testing approach

PlayNext uses layered verification so that a single successful page load is not treated as proof that the whole system works. Deterministic unit and scenario tests cover the intent interpreter and recommendation engine. Static integration tests verify the protected API boundary, database migration, environment configuration and accessibility structure. Linting and TypeScript checking detect code-quality and type errors. Browser checks cover public-page responsiveness. Authenticated and cross-user workflows remain in the reproducible manual checklist because they require real Supabase accounts and data.

## 2. Automated result

The complete gate passed **54 of 54 automated tests**, followed by a clean ESLint run and a clean TypeScript check.

| Area | Evidence | Result |
| --- | --- | --- |
| Intent extraction | time phrases, multiple experiences, exclusions, corrections, vague requests and hostile/invalid AI output | Pass |
| Recommendation behaviour | context, preferences, feedback decay, history diversity, eligibility, deduplication and explanations | Pass |
| Scenario benchmark | 11 predefined session scenarios with an expected top-ranked game | 11/11 (100%) |
| Engine throughput | ranking 1,000 synthetic candidates on the local test machine | Pass: below the 1,000 ms guardrail |
| API security structure | protected routes require bearer-token validation; browser clients use authenticated requests | Pass |
| Database hardening | RLS, grants, ownership policies and bounded-value constraints are present in the migration | Pass |
| Configuration | secrets excluded from Git, RAWG key remains server-only, security headers configured | Pass |
| Accessibility structure | language, zoom-safe viewport, skip link, visible focus, mobile input sizing and reduced motion | Pass |
| Code quality | ESLint | Pass |
| Type safety | TypeScript compiler without emitting files | Pass |

The scenario benchmark is a transparent, developer-authored test set. Its 100% result demonstrates agreement with those specified cases; it is not a claim of 100% recommendation accuracy for all users.

## 3. Browser evidence

The public authentication experience was inspected in the in-app browser at 320×568, 390×844, 768×1024 and 1440×900. No horizontal overflow was detected. The email form remained usable at 390×844, and its text fields computed to 16 px, avoiding automatic mobile-browser zoom. Authenticated dashboard pages were not marked as browser-tested because the test session had no user credentials.

## 4. Requirements traceability

| ID | Requirement | Primary implementation | Evidence |
| --- | --- | --- | --- |
| FR-01 | Users can create an account, sign in, reset a password and sign out | `src/app/(auth)`, `src/app/auth/callback`, Supabase Auth | Manual QA A01–A06; public responsive checks |
| FR-02 | New users can record genres, platforms and initial games | `src/app/onboarding` | Manual QA O01–O04 |
| FR-03 | Users can browse, search and inspect game details | `src/app/dashboard/search`, protected game APIs | Configuration/security tests; manual QA G01–G05 |
| FR-04 | Users can add, view, filter and remove collection games | collection page and game components | Manual QA C01–C05 |
| FR-05 | Users can receive a recommendation from their collection | Decide page and recommendation engine | Engine tests; scenario benchmark; manual QA D01 |
| FR-06 | Users can discover a recommendation outside their collection | discovery API and source mode | Engine/security tests; manual QA D02 |
| FR-07 | Conversation text becomes structured decision context | extract-intent API and `src/lib/intent.ts` | Intent tests; manual QA D03–D05 |
| FR-08 | Feedback affects later recommendations without permanent accidental exclusion | feedback UI and recommendation engine | Feedback-decay tests; manual QA F01–F06 |
| FR-09 | Users can inspect history and update preferences/settings | history and settings pages | Manual QA H01–H03 and S01–S05 |
| NFR-01 | Personal data is isolated by user | Supabase RLS migration | Database-policy tests; SQL evidence script; manual QA SEC-01 |
| NFR-02 | Secrets and protected integrations remain server-side | server-only RAWG client and API protection | Configuration and security tests |
| NFR-03 | The interface adapts to phones, tablets and desktops | responsive CSS and mobile navigation | Browser evidence; manual QA R01–R06 |
| NFR-04 | Core interaction supports keyboard, zoom and reduced motion | shared layouts and CSS | Accessibility-structure tests; manual QA A11Y-01–A11Y-05 |
| NFR-05 | Recommendation ranking is deterministic and explainable | recommendation engine and explanation builder | Engine and benchmark tests |

## 5. Evaluation findings

The strongest technical outcome is the separation of responsibilities. The AI interprets the conversation into bounded criteria, while deterministic application code ranks candidates using live context, saved preferences, previous feedback, history and game quality. This is easier to test and explain than allowing a language model to choose the result directly. The two recommendation sources use the same scoring process but different candidate pools.

Testing also produced useful corrective evidence. A coordinated exclusion such as “no horror or strategy” originally captured only the first genre; the parser now handles all genres in the exclusion clause. A broad “Adventure” match also made an ordinary adventure game tie with a game explicitly tagged “Open World” and “Exploration”; primary experience signals now break that tie in favour of the more precise match.

## 6. Limitations and next evidence

- The 11-scenario benchmark is intentionally small and synthetic. A larger labelled dataset and real-user judgement would provide stronger external validity.
- Authenticated end-to-end flows, account recovery and cross-user RLS isolation still require manual execution with dedicated test accounts.
- The current rate limiter is appropriate for a single local process but a distributed production deployment would require a shared store.
- The throughput guardrail measures the ranking function, not full network latency or browser rendering.
- Formal usability evaluation with participants must not begin without confirming and, where required, obtaining university ethics approval.

Complete `docs/MANUAL_QA_CHECKLIST.md`, save screenshots or screen recordings for important cases, and retain anonymised results as evaluation evidence. Do not include passwords, API keys, access tokens or identifiable participant data.
