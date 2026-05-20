# Approach

## Test Data

The supplied employer account started with no jobs, so the suite creates one public job at the start of each run. The job title includes a run id, for example `QA Automation Engineer mpe2ddyp`, which keeps parallel or repeated runs separate.

The candidate is also unique per run:

- Email: `moiz.guest.<run-id>@example.com`
- Name: `Moiz Guest<run-id>`
- Resume: generated DOCX file in the Playwright output folder

The test closes the job at the end of the run. If staging fails before cleanup, the next run is still isolated because the job slug and candidate email are unique.

## Job Selection

The test does not depend on existing staging jobs. It creates a job through the employer API, publishes it as `APPROVED`, then opens the public `/jobs/{slug}` page as a guest candidate. This removes risk from shared staging data while still testing the real guest application UI.

## Verification

The guest side is verified through the browser:

- Public job page is visible.
- Resume upload parses successfully.
- Candidate details are submitted.
- The success state appears.

The employer side is verified two ways:

- Corporate login runs through the UI.
- The job pipeline page shows the Applications count and candidate row.
- Playwright `request` polls the pipeline candidates endpoint and matches the exact candidate email.

The API poll is deliberate. The application is first created as `PREPROCESSING`, then moves into the Applications stage asynchronously. Polling the endpoint makes the test stable without hiding that backend delay.

## Screenshots

Screenshots are saved at these points:

- Public job page.
- Resume uploaded.
- Application ready to submit.
- Application submitted.
- Employer logged in.
- Employer pipeline count.
- Employer application visible.

## Gaps

These tests do not judge visual polish, animation smoothness, or pixel-level layout issues. They confirm the user flow and data movement.

Responsive coverage is limited to one desktop viewport. A production suite should add mobile and tablet runs for the public job and modal apply flow.

The resume parser is covered with one DOCX shape. A broader suite should include PDF, larger DOCX files, missing phone, missing email, and malformed files.

Email delivery, notifications, analytics, and third-party job board posting are outside this flow.

The suite does not validate accessibility beyond using accessible locators where the app exposes them. Keyboard-only apply and screen reader checks would be useful follow-up coverage.

## Issues Seen While Testing

The job application success screen has a copy issue: `succesfully` should be `successfully`.

Some direct public routes showed untranslated cookie and consent strings during exploration, including `COOKIE_BANNER_DESCRIPTION`, `COOKIE_BANNER_BUTTON`, and `I_CONSENT_TO_PROCESSING_OF_MY_PERSONAL_DATA_IN_LINE_WITH_THEPRIVACY_POLICYANDTERMS_AND_CONDITIONS`. I did not make this a hard assertion because it was outside the main application path, but it is worth raising.

The job publish API returned one transient `502 Bad Gateway` during setup exploration. The suite retries `502`, `503`, and `504` responses on non-auth setup calls. Authentication is not retried blindly because of the staging throttle.

## Recommendations

Add a seeded staging employer with a dedicated cleanup job or admin endpoint. That would reduce data buildup when a run is interrupted.

Expose stable `data-testid` attributes on the application modal and employer pipeline. The current selectors are careful, but the app mixes accessible text, generated ids, and component-library markup.

Add a lower-environment worker that finishes candidate preprocessing faster or exposes a job status endpoint. The current async pipeline delay is handled, but it is the main source of runtime variance.
