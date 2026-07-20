# PlayNext Recommendation Engine

## Responsibility boundary

PlayNext uses a hybrid architecture. Gemini is an intent interpreter, not the recommender. It converts the conversation into a bounded structure containing mood, time, energy, desired experiences, difficulty, pace, multiplayer preference, genres, exclusions and explicitly mentioned reference games. Deterministic application code then produces the ranking.

This boundary prevents an opaque model response from silently selecting a game and makes the final decision reproducible, testable and explainable.

## Ranking pipeline

1. **Candidate retrieval** — collection mode loads the user's games. Discovery mode retrieves interleaved contextual, genre-focused, recent and critically acclaimed RAWG groups, removes owned and duplicated games, applies explicit genre exclusions and retains up to 90 candidates.
2. **Eligibility** — malformed games, explicitly avoided genres and games marked already played are rejected before ranking. A directly requested title can override the already-played rule.
3. **Live context** — time, mood, energy, requested experiences, current genres, difficulty, pace and multiplayer intent receive the greatest positive or negative weight.
4. **Saved preferences** — onboarding and Settings choices support tie-breaking but cannot overrule an explicit current request.
5. **Feedback learning** — structured feedback is time-decayed and context-sensitive. Similarity uses genre, tag and platform overlap. Clear negative note phrases such as “less combat” can add a small transferable signal; free text never outweighs the structured feedback type.
6. **History diversity** — exact recent repeats receive a strong reduction. Very recent same-genre recommendations receive a small capped reduction to prevent monotonous results without making a genre unavailable.
7. **Quality reliability** — public rating is only a tie-breaker and is discounted when based on a tiny number of votes. Metacritic contributes at most a small supporting signal.
8. **Calibration** — the displayed match score has an evidence-dependent ceiling. Sparse requests cannot produce a misleading near-perfect result.
9. **Decision confidence** — a separate value combines intent confidence, evidence coverage, leading score strength and the margin over the runner-up.
10. **Clarification** — if several eligible games are close and the evidence is weak, PlayNext asks one targeted follow-up instead of forcing an arbitrary winner.

## Score boundaries

| Factor | Range | Purpose |
| --- | ---: | --- |
| Baseline | 42 | Neutral starting point |
| Live context | -40 to +44 | Current-session priority |
| Saved preferences | -4 to +18 | Long-term supporting taste |
| Learned feedback | -45 to +15 | Personal correction with decay |
| Recommendation history | -42 to +5 | Repeat prevention and resumability |
| Game quality | -3 to +7 | Reliability-weighted tie-breaker |

Scores are constrained to 0–100, but they are not probabilities. “80 match score” means a stronger measured fit than a lower-ranked candidate under the same request; it does not claim an 80% chance that every user will like the game.

## Feedback semantics

- **Great match:** positive exact-game and cautious similarity signal.
- **Not my mood:** strong recent reduction for that game which fades as context changes over time.
- **Too long:** strongest during short future sessions and weak during long sessions.
- **Too difficult:** strongest unless the user explicitly requests hard difficulty later.
- **Not interested:** stronger negative preference signal, but still time-decayed rather than permanent.
- **Already played:** ineligible unless the user explicitly asks for the game.

## Verification

`npm run test:engine` covers ranking factors, exclusions, decay, history, ambiguity, calibration, deterministic ordering and performance. `npm run test:evaluation` executes the 30-scenario transparent benchmark. These tests establish internal correctness against specified expectations; they do not replace independent human evaluation.

## Known boundaries

- RAWG tags and playtime are imperfect metadata and may be incomplete.
- A user's idea of “relaxing” or “difficult” is subjective and can change.
- Similarity transfer is deliberately conservative to avoid learning a broad dislike from one result.
- The benchmark is developer-authored and therefore cannot establish external validity by itself.
- Formal user evaluation must follow the university ethics process before participants are recruited or data is collected.
