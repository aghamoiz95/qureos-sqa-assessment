import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config, validateConfig } from '../support/config';
import { createResume, type CandidateData } from '../support/resume';
import {
  closeJob,
  createPublicJob,
  getDefaultWorkspace,
  signInWithApi,
  waitForCandidateInApplications,
  type Job
} from '../support/qureosApi';

test('guest candidate application is visible in the employer pipeline', async ({ browser, request }, testInfo) => {
  validateConfig();

  const runId = Date.now().toString(36);
  const screenshotsDir = path.resolve('artifacts', 'screenshots', runId);
  const candidate: CandidateData = {
    firstName: 'Moiz',
    lastName: `Guest${runId}`,
    email: `moiz.guest.${runId}@example.com`,
    phone: '+971501234567',
    location: 'Dubai, United Arab Emirates',
    nationality: 'Pakistani'
  };

  let setupToken = '';
  let job: Job | undefined;

  try {
    const setupAuth = await signInWithApi(request);
    setupToken = setupAuth.token;
    const workspace = await getDefaultWorkspace(request, setupToken);
    job = await createPublicJob(request, setupToken, workspace._id, runId);

    const guestContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const guestPage = await guestContext.newPage();

    await test.step('Guest opens the public job post', async () => {
      await guestPage.goto(`${config.baseUrl}/jobs/${job!.slug}`, { waitUntil: 'domcontentloaded' });
      await acceptCookies(guestPage);
      await expect(guestPage).toHaveURL(new RegExp(job!.slug));
      await expect(guestPage.getByRole('heading', { name: /QA Automation Engineer/i }).first()).toBeVisible();
      await expect(guestPage.getByRole('button', { name: /easy apply/i }).first()).toBeVisible();
      await saveScreenshot(guestPage, screenshotsDir, '01-public-job.png');
    });

    await test.step('Guest uploads a resume and confirms parsed details', async () => {
      const resumePath = testInfo.outputPath(`resume-${runId}.docx`);
      await createResume(resumePath, candidate);

      await guestPage.getByRole('button', { name: /easy apply/i }).first().click();
      await guestPage.locator('input[type="file"]').setInputFiles(resumePath);
      await guestPage.locator('#candidate-data-consent').check({ force: true });
      await expect(guestPage.getByText(/imported successfully/i)).toBeVisible({ timeout: 45_000 });
      await saveScreenshot(guestPage, screenshotsDir, '02-resume-uploaded.png');

      await guestPage.getByRole('button', { name: /^next$/i }).click();
      await expect(guestPage.locator('input[name="email"]')).toBeVisible();
      await guestPage.locator('input[name="email"]').fill(candidate.email);
      await guestPage.locator('input[name="firstName"]').fill(candidate.firstName);
      await guestPage.locator('input[name="lastName"]').fill(candidate.lastName);
      await guestPage.locator('input[name="gender"][value="male"]').check({ force: true });
      await expect(guestPage.getByPlaceholder('Current Location (add your city)')).toHaveValue(/Dubai/);
      await selectNationality(guestPage, candidate.nationality);
      const phoneInput = guestPage.locator('input[type="tel"]');
      const phoneValue = await phoneInput.inputValue();
      if (!phoneValue.includes('501234567')) {
        await phoneInput.fill(candidate.phone.replace('+971', ''));
      }
      await guestPage.locator('#sms-consent-guest-user').check({ force: true });
      await expect(guestPage.getByRole('button', { name: /submit application/i })).toBeEnabled();
      await saveScreenshot(guestPage, screenshotsDir, '03-application-ready.png');
    });

    await test.step('Guest submits the application', async () => {
      const applicationResponse = guestPage.waitForResponse(
        response => response.url().includes(`/jobs/${job!._id}/apply`) && response.request().method() === 'POST',
        { timeout: 60_000 }
      );
      await guestPage.getByRole('button', { name: /submit application/i }).click();
      const response = await applicationResponse;
      expect(response.status(), await response.text()).toBe(201);
      await expect(guestPage.getByText('Application Submitted!', { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(guestPage.getByText(candidate.email)).toBeVisible();
      await saveScreenshot(guestPage, screenshotsDir, '04-application-submitted.png');
    });

    await guestContext.close();

    const employerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const employerPage = await employerContext.newPage();

    await test.step('Employer logs in through the corporate UI', async () => {
      await employerPage.goto(`${config.baseUrl}/corporate/login`, { waitUntil: 'domcontentloaded' });
      await employerPage.locator('input[type="email"]').fill(config.corporateEmail);
      await employerPage.locator('input[type="password"]').fill(config.corporatePassword);
      const signInResponse = employerPage.waitForResponse(
        response => response.url().includes('/auth/signin') && response.request().method() === 'POST',
        { timeout: 30_000 }
      );
      await employerPage.getByRole('button', { name: /^sign in$/i }).click();
      const response = await signInResponse;
      if (response.status() === 429) {
        throw new Error('Qureos auth rate limit reached. Wait 15 minutes before rerunning the suite.');
      }
      expect(response.status(), await response.text()).toBe(201);
      await expect(employerPage).toHaveURL(/corporate-v2\/workspace/);
      await saveScreenshot(employerPage, screenshotsDir, '05-employer-logged-in.png');
    });

    const pipelineCandidate = await test.step('Pipeline API confirms the application reached Applications', async () => {
      return await waitForCandidateInApplications(request, setupToken, job!.pipelineId, candidate.email);
    });

    await test.step('Employer sees the candidate in the Applications stage', async () => {
      await employerPage.goto(`${config.baseUrl}/corporate-v2/workspace/${workspace._id}/jobs/${job!._id}`, {
        waitUntil: 'domcontentloaded'
      });
      await expect(employerPage.getByText(job!.title, { exact: false }).first()).toBeVisible();
      const applicationsStage = employerPage.locator('[role="button"]').filter({ hasText: 'Applications' });
      await expect(applicationsStage).toContainText('1', { timeout: 30_000 });
      await saveScreenshot(employerPage, screenshotsDir, '06-employer-pipeline-count.png');

      const applicationsResponse = employerPage.waitForResponse(
        response => response.url().includes(`/pipelines/${job!.pipelineId}/candidates`) && response.url().includes('stageTitle=Applications'),
        { timeout: 30_000 }
      );
      await applicationsStage.click();
      await applicationsResponse;
      await expect(employerPage.getByText(`${candidate.firstName} ${candidate.lastName}`)).toBeVisible();
      await expect(employerPage.getByText(pipelineCandidate.statusTitle)).toBeVisible();
      await saveScreenshot(employerPage, screenshotsDir, '07-employer-application-visible.png');
    });

    await employerContext.close();
  } finally {
    if (setupToken && job?._id) {
      await closeJob(request, setupToken, job._id).catch(() => undefined);
    }
  }
});

async function acceptCookies(page: Page) {
  await page.getByRole('button', { name: /agree|cookie/i }).click({ timeout: 3_000 }).catch(() => undefined);
}

async function selectNationality(page: Page, nationality: string) {
  const input = page.locator('input[type="search"]').last();
  await input.fill('Pakistan');
  const option = page.locator('.ant-select-item-option-content').filter({ hasText: nationality }).last();
  if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await option.click();
  } else {
    await page.keyboard.press('Enter');
  }
  await expect(page.getByText(nationality).last()).toBeVisible();
}

async function saveScreenshot(page: Page, dir: string, name: string) {
  await fs.mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, name), fullPage: true });
}
