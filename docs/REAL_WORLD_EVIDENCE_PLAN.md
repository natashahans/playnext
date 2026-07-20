# PlayNext Real-World Evidence Plan

**Prepared:** 20 July 2026  
**Ethics record in Interim Progress Report:** approved, `2571-ST-HSET-2026`  
**Recorded expiry:** 5 August 2026

This plan separates technical verification from participant evaluation. A completed app is not evidence that users can operate it or that its recommendations feel relevant.

## 1. Confirm the authority to proceed

Before contacting participants:

1. Download the signed approval letter and final approved attachments.
2. Confirm the approved participant eligibility, sample size, recruitment method, session format, tasks, questionnaire, recording method, storage location, retention period and withdrawal procedure.
3. Ask the supervisor whether collection must finish before 5 August 2026 and whether an extension is required.
4. Compare the approved documents with `docs/USABILITY_EVALUATION_PROTOCOL.md`. Remove or formally amend anything that was not approved.
5. Keep consent documents and any participant contact details outside Git.

**Gate:** do not recruit or collect data until every item is confirmed.

## 2. Finish technical preflight

Use a development/test Supabase project and dedicated test accounts.

1. Run `npm run verify` and `npm run build -- --webpack`.
2. Configure two dedicated accounts locally and run `npm run test:live-rls`.
3. Run `supabase/tests/rls_verification.sql`; retain screenshots or exports containing no secrets.
4. Complete every core row in `docs/MANUAL_QA_CHECKLIST.md`.
5. Test authenticated pages at 320×568, 390×844, 768×1024 and desktop, plus phone landscape and 200% zoom.
6. Test the full journey with keyboard only and with VoiceOver or NVDA.
7. Fix failures, rerun the affected checks, then rerun the complete release gate.

Record the date, browser/device, app commit identifier, result and evidence reference for each check. A check that was not performed remains **Not run** or **Blocked**.

## 3. Freeze the evaluation version

After technical preflight:

1. Commit the tested version and record its Git commit identifier.
2. Record the recommendation-engine version, configuration and benchmark result.
3. Prepare test accounts or a safe participant account flow that matches the approved study.
4. Seed a consistent but realistic catalogue where the approved task requires it.
5. Do not tune engine weights using the participant evaluation responses and then report those same responses as independent validation.

If the artefact changes during evaluation, record which participants used each version. After a material engine change, use fresh evaluation cases or clearly label earlier results as development evidence.

## 4. Prepare the approved evaluation pack

Use the final approved versions of:

- recruitment message
- participant information sheet
- consent form
- task sheet
- questionnaire
- debrief and withdrawal instructions

Assign anonymous codes such as `P01`; do not place names or email addresses in the results file. Store consent separately. Do not record passwords, access tokens, private emails or unrelated screen content.

## 5. Run each session consistently

Follow only the approved procedure. A typical order, when approved, is:

1. Provide the information sheet and answer questions.
2. Obtain informed consent before observation or data collection.
3. Assign an anonymous participant code and record device category and relevant experience without unnecessary identity data.
4. Ask the participant to complete the approved core tasks without coaching.
5. Record success/partial/failure, assistance, critical errors and time cautiously.
6. Collect the approved relevance, explanation-clarity, mode-clarity, control and usability ratings.
7. Collect optional approved comments without leading the participant.
8. Give the debrief and repeat the withdrawal procedure.

Do not convert a failed task into a success because the researcher intervened. Record the assistance and the original difficulty.

## 6. Analyse the evidence

Report:

- participant and device characteristics in aggregate
- task-completion rate and assistance rate
- median task time where meaningful
- recommendation-relevance distribution
- explanation-clarity, source-mode clarity and perceived-control distributions
- top-one agreement or ranking evidence only if that comparison was approved
- recurring qualitative themes with anonymised, short quotations where consent allows
- disagreement and failure examples
- limitations including sample size, convenience sampling, researcher involvement and participant familiarity

Separate observation from interpretation. Do not describe a small convenience sample as statistically generalisable, and do not describe a developer-authored benchmark as real-user accuracy.

## 7. Close the evaluation loop

1. Map findings to requirements and project objectives.
2. Prioritise issues by severity and frequency.
3. Make evidence-backed fixes.
4. Rerun technical regression tests and the affected manual tasks.
5. Retain an anonymised change log showing finding, decision, change and verification.
6. Report unresolved limitations honestly in the final report.

## Evidence checklist

- signed ethics approval and approved study documents stored privately
- supervisor confirmation concerning the expiry date
- release-gate output
- live two-account RLS result
- completed manual QA checklist
- responsive and accessibility evidence
- frozen evaluation commit identifier
- anonymous participant-results file
- aggregated tables/charts
- thematic analysis notes without direct identifiers
- post-evaluation change log and regression result
