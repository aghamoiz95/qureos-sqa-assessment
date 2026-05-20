# Qureos SQA Assessment

Playwright suite for the Qureos staging guest application flow.

## What It Covers

- Creates a fresh public job for the supplied corporate employer.
- Applies to that job as a guest candidate with a generated DOCX resume.
- Logs in through the corporate UI.
- Verifies the submitted candidate appears in the employer Applications stage.
- Captures screenshots under `artifacts/screenshots`.
- Uses Playwright `request` calls for setup and pipeline verification.

## Setup

```bash
npm install
npx playwright install chromium
```

Create `.env`:

```bash
QUREOS_BASE_URL=https://new-stg.qureos.com
QUREOS_API_BASE_URL=https://api-v3-stg.qureos.com
QUREOS_CORPORATE_EMAIL=your-email
QUREOS_CORPORATE_PASSWORD=your-password
```

## Run

```bash
npm test
```

Stability check:

```bash
npm run test:three
```

Open the HTML report:

```bash
npm run report
```

## Artifacts

Screenshots are saved in `artifacts/screenshots/<run-id>`.

Traces, videos, and failure screenshots are saved in `test-results` and `playwright-report`.

Latest local check: `npm run test:three` passed 3 out of 3 on May 20, 2026.

## Auth Throttle

The test uses two sign-ins per run: one API sign-in for job setup, one UI sign-in for employer verification. Three clean runs stay under the 15 requests per 15 minutes staging limit.
