# Workflow

## Map

```text
Assessment email
      |
      v
Read requirements and risks
      |
      v
Plan test boundaries
      |
      +--> AI assistant: checklist, likely risks, repo shape
      |
      v
Explore staging by hand and with Playwright scripts
      |
      +--> Manual: confirm pages, forms, screenshots
      +--> AI assistant: route probes, selector ideas, API discovery
      |
      v
Find employer state
      |
      +--> Corporate account had zero jobs
      |
      v
Create deterministic setup
      |
      +--> API: sign in, create job, publish job
      |
      v
Automate guest apply flow
      |
      +--> UI: job page, resume upload, parsed details, submit
      |
      v
Automate employer verification
      |
      +--> UI: corporate login, job pipeline
      +--> API: poll Applications stage by candidate email
      |
      v
Run headless, inspect artifacts, tighten waits
      |
      v
Document approach, gaps, CI
```

## Tools Used

An OpenAI coding assistant helped with fast exploration scripts, Playwright locator choices, endpoint tracing, and draft review.

Manual work covered checking the assessment, choosing the final test shape, reviewing staging behavior, validating screenshots, and deciding which gaps should be documented.

## Prompts Used

Prompt:

```text
understand this requirement fully SQA Engineer Technical Assessment...
```

Result: a checklist of required deliverables, risks, and what credentials were still needed.

Prompt:

```text
i need to impress my manager, we need to fulfill all requrements
No item should look ai made
no comment
no AI text in md files
start
think carefully, understand fully,
```

Result: an implementation plan focused on a clean repo, stable Playwright flow, screenshots, CI, and written docs without filler.

## Time Breakdown

| Area | Time | Split |
| --- | ---: | --- |
| Requirement review and plan | 25 min | 15 min AI-assisted, 10 min manual |
| Staging exploration | 1 hr 25 min | 55 min AI-assisted scripts, 30 min manual checks |
| Test implementation | 1 hr 35 min | 60 min AI-assisted coding, 35 min manual review |
| Debugging and stability work | 55 min | 25 min AI-assisted, 30 min manual |
| Docs and CI | 40 min | 20 min AI-assisted, 20 min manual |

Total: about 5 hours.
