# PlayNext Manual QA Checklist

Use a development/test Supabase project. Record **Pass**, **Fail** or **Blocked**, the date, browser/device and a short evidence reference. Never record passwords, tokens or API keys.

## Authentication and onboarding

| ID | Test | Expected result | Status |
| --- | --- | --- | --- |
| A01 | Sign up with a new valid email | Confirmation journey appears; no account-existence disclosure | Not run |
| A02 | Sign in with valid credentials | User reaches the correct onboarding/dashboard destination | Not run |
| A03 | Sign in with an incorrect password | Clear generic error; no sensitive detail exposed | Not run |
| A04 | Request and complete password reset | Secure email link opens the reset form and new password works | Not run |
| A05 | Log out, then revisit `/dashboard` | Session ends and protected page redirects to login | Not run |
| A06 | Refresh an authenticated dashboard page | Session persists and page data reloads correctly | Not run |
| O01 | Complete genres and platforms | Choices persist to the user’s preferences | Not run |
| O02 | Add and skip initial games | Both routes complete without trapping the user | Not run |
| O03 | Refresh midway through onboarding | Progress and navigation remain valid | Not run |
| O04 | Complete onboarding | Dashboard becomes accessible and does not redirect back | Not run |

## Catalogue and collection

| ID | Test | Expected result | Status |
| --- | --- | --- | --- |
| G01 | Open Add games with a valid RAWG key | Featured and category rails load without error | Not run |
| G02 | Search by title and studio | Relevant results appear; empty query is handled | Not run |
| G03 | Open a game card | Correct detail page, media and metadata appear | Not run |
| G04 | Open a game with no trailer/image | Intentional fallback appears; layout does not break | Not run |
| G05 | Add a game twice | Collection contains one record; UI reports existing state | Not run |
| C01 | Open My collection | Only the signed-in user’s games appear | Not run |
| C02 | Filter/search collection | Results and empty states update correctly | Not run |
| C03 | Change game status | Status persists after refresh | Not run |
| C04 | Remove a game and confirm | Item disappears and stays removed after refresh | Not run |
| C05 | Cancel removal | No data changes | Not run |
| C06 | Load more than 48 collection games | Lifetime status totals remain exact; recent-page rating is clearly labelled | Not run |

## Decision assistant and learning

| ID | Test | Expected result | Status |
| --- | --- | --- | --- |
| D01 | Collection mode with at least three saved games | Recommendation is owned, eligible and explained | Not run |
| D02 | Discover mode | Recommended game is outside the collection | Not run |
| D03 | Enter “I have 30 minutes and want something relaxing” | Context shows time/energy/experience accurately | Not run |
| D04 | Enter “I want an RPG, but no horror or strategy” | RPG is preferred; Horror and Strategy are excluded | Not run |
| D05 | Correct an earlier exclusion | Updated intent replaces the earlier criterion | Not run |
| D06 | Expand complete score | Details expand without resizing/distorting the game artwork | Not run |
| D07 | Continue the conversation after a result | Context remains available and a follow-up can refine the answer | Not run |
| D08 | Ask again | New recommendation avoids immediate repetition where alternatives exist | Not run |
| D09 | Give a deliberately vague request with several equal candidates | PlayNext asks one targeted clarification instead of presenting an arbitrary winner | Not run |
| F01 | Mark Great match | Feedback persists and positively supports later similar matches | Not run |
| F02 | Mark Not my mood | Game is reduced for the current period, not permanently deleted | Not run |
| F03 | Mark Too long | Short future requests penalise the game more than long requests | Not run |
| F04 | Mark Too difficult | Easy requests penalise the game appropriately | Not run |
| F05 | Mark Not interested | Strong negative feedback persists | Not run |
| F06 | Submit feedback twice | One controlled feedback record/result is produced | Not run |
| F07 | Add a note such as “I want less combat tonight” | Similar combat-heavy games receive a small temporary reduction; unrelated games are not broadly penalised | Not run |

## History and settings

| ID | Test | Expected result | Status |
| --- | --- | --- | --- |
| H01 | Open History after recommendations | Correct chronological records and modes appear | Not run |
| H02 | Open a history item | Recommendation explanation/context is understandable | Not run |
| H03 | Use history filters/empty state | Correct state is shown without layout shift | Not run |
| H04 | Load more than 30 decisions | Lifetime totals remain exact and the recent average is clearly labelled | Not run |
| S01 | Change genres, platforms and play style | Saved values persist after refresh | Not run |
| S02 | Change display name and save | Setting persists and dashboard greeting updates after navigation/refresh | Implemented; manual live check not run |
| S03 | Trigger validation failure | Error is specific, readable and preserves valid edits | Not run |
| S04 | Cancel/discard changes | Stored settings remain unchanged | Not run |
| S05 | Use account/logout controls | Correct confirmation and navigation occur | Not run |

## Security, responsiveness and accessibility

| ID | Test | Expected result | Status |
| --- | --- | --- | --- |
| SEC-01 | Use two test accounts and try to read/update the other account’s rows | Supabase returns no unauthorised personal rows and rejects writes | Not run |
| SEC-02 | Call protected game APIs without a bearer token | Request returns 401 | Not run |
| SEC-03 | Inspect a production response | CSP, frame, content-type, referrer, permissions and HSTS headers exist | Not run |
| R01 | Login at 320×568 | No horizontal overflow; all controls usable | Pass — 20 Jul 2026, in-app browser |
| R02 | Login/email at 390×844 | No overflow; inputs are 16 px; primary control is touch-sized | Pass — 20 Jul 2026, in-app browser |
| R03 | Login at 768×1024 | Layout remains balanced and usable | Pass — 20 Jul 2026, in-app browser |
| R04 | Login at 1440×900 | Desktop composition remains correct | Pass — 20 Jul 2026, in-app browser |
| R05 | Test every dashboard page at 390×844 and 768×1024 | Mobile navigation, cards, dialogs and forms remain usable | Not run |
| R06 | Rotate a phone to landscape | Content remains accessible without clipping | Not run |
| A11Y-01 | Navigate each page using Tab/Shift+Tab/Enter/Escape only | Focus is visible, logical and never trapped | Not run |
| A11Y-02 | Activate Skip to main content | Focus moves past dashboard navigation | Not run |
| A11Y-03 | Zoom browser to 200% | Content reflows without lost controls or horizontal page scrolling | Not run |
| A11Y-04 | Enable reduced motion | non-essential transitions/animations are suppressed | Not run |
| A11Y-05 | Test with VoiceOver or NVDA | Names, roles, state changes and errors are announced clearly | Not run |

## Final regression gate

1. Run `npm run verify` and retain the console output.
2. Complete every core row above; resolve all failed authentication, collection and recommendation tests.
3. Run `supabase/tests/rls_verification.sql` and retain its read-only output.
4. Test the production build on at least one phone, one tablet-sized viewport and one desktop browser.
5. Record known limitations honestly in the final report rather than marking unexecuted cases as passed.
