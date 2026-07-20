# PlayNext Usability and Recommendation Evaluation Protocol

## Ethics gate and current status

The Interim Progress Report records the study as **Ethics Approved** under project ID **2571** and review reference **2571-ST-HSET-2026**, with an approval expiry date of **5 August 2026**. That report entry is supporting evidence, but the signed approval letter and its approved attachments remain authoritative.

Before recruitment, compare this protocol with the final approved application, participant information sheet, consent form, recruitment text, task sheet and questionnaire. Use the approved versions without silently adding participants, recording methods, questions or data fields. Ask the supervisor or ethics contact whether all data collection must finish before the expiry date and request an extension or amendment if required.

Do not recruit, observe or collect questionnaire data when the approval has expired, when the signed conditions cannot be confirmed, or when the intended procedure differs materially from the approved study. Automated and self-testing may continue, but they are not substitutes for independent user evidence. Never fabricate participants, scores or quotations.

## Evaluation questions

1. Can a new user complete the core journey without assistance?
2. Do users understand the difference between collection and discovery modes?
3. Does the recommended game fit the stated mood, time, energy and desired experience?
4. Do users understand why the result was selected?
5. Does structured feedback behave in the way users expect?
6. Is the experience usable on both a phone and a desktop?

## Suggested participant study after approval

Use a small, clearly described convenience sample appropriate to an undergraduate evaluation. Record the recruitment method, gaming experience and device type without collecting unnecessary identifying information. Do not claim statistical generalisability from a small sample.

### Tasks

1. Create an account and complete onboarding.
2. Add at least five games representing different genres.
3. Ask for a short, low-energy collection recommendation.
4. Refine the request after seeing a provisional or close result.
5. Switch to discovery mode and request something new.
6. Inspect the explanation and score breakdown.
7. submit one feedback reason and request another recommendation.
8. Find the previous result in History and update one preference in Settings.
9. Repeat the decision task on a phone-sized viewport.

### Measurements

- task completion: success, partial or failure
- critical errors and points where assistance was required
- time on task, interpreted cautiously
- recommendation relevance: 1–5
- explanation clarity: 1–5
- source-mode clarity: 1–5
- perceived control: 1–5
- overall usability questionnaire, using the university-approved instrument
- short optional qualitative comment

### Recommendation comparison

Freeze the engine version before evaluation. Prepare a holdout set of realistic session descriptions that were not used to tune the weights. For each session, present a small candidate set and ask the evaluator to identify the best fit before revealing PlayNext's ranking. Report:

- top-one agreement
- top-three inclusion
- mean reciprocal rank where a single preferred answer exists
- number of cases where PlayNext correctly asks for clarification
- disagreement examples and the reason for each disagreement

Do not tune the engine on the holdout set and then report the same set as independent evidence. If changes are made after reviewing it, create a new holdout set or label the result as development evidence.

## Data handling

- assign anonymous participant codes rather than names
- do not record passwords, authentication tokens or API keys
- avoid screen recordings that expose email addresses unless specifically approved and securely handled
- store consent and response data according to university policy
- tell participants how to withdraw and how long data will be retained
- report aggregated results and anonymise free-text comments

## Analysis

Report both successful and unsuccessful cases. Separate observed facts from interpretation. Explain sample limitations, device limitations and researcher bias. Link every conclusion to recorded evidence and identify engine changes that followed from evaluation.

Use `docs/evaluation/participant-results-template.csv` only after the ethics gate above has been checked against the actual approval documents. Store consent records separately from anonymous results and never commit identifiable participant data to Git.
