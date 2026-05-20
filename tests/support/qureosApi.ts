import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect } from '@playwright/test';
import { config } from './config';

export type Workspace = {
  _id: string;
  title: string;
  companyId: string;
};

export type Job = {
  _id: string;
  title: string;
  slug: string;
  pipelineId: string;
  status: string;
};

export type PipelineCandidate = {
  _id: string;
  firstName: string;
  lastName: string;
  stageTitle: string;
  statusTitle: string;
  profile: {
    email: string;
    firstName: string;
    lastName: string;
  };
};

type AuthResult = {
  token: string;
};

export async function signInWithApi(request: APIRequestContext): Promise<AuthResult> {
  const response = await request.post(`${config.apiBaseUrl}/auth/signin`, {
    data: {
      email: config.corporateEmail,
      password: config.corporatePassword
    }
  });

  if (response.status() === 429) {
    throw new Error('Qureos auth rate limit reached. Wait 15 minutes before rerunning the suite.');
  }

  expect(response.status(), await response.text()).toBe(201);
  const body = await response.json();
  expect(body.token).toBeTruthy();
  return { token: body.token };
}

export async function getDefaultWorkspace(request: APIRequestContext, token: string): Promise<Workspace> {
  const response = await withApiRetry(() =>
    request.get(`${config.apiBaseUrl}/workspaces?offset=0&limit=1000`, {
      headers: authHeaders(token)
    })
  );
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  const workspace = body.data?.find((item: Workspace & { isDefault?: boolean }) => item.isDefault) ?? body.data?.[0];
  expect(workspace).toBeTruthy();
  return workspace;
}

export async function createPublicJob(request: APIRequestContext, token: string, workspaceId: string, runId: string): Promise<Job> {
  const title = `QA Automation Engineer ${runId}`;
  const createResponse = await withApiRetry(() =>
    request.post(`${config.apiBaseUrl}/jobs/v2`, {
      headers: authHeaders(token),
      data: {
        title,
        locations: [{ location: 'Dubai, United Arab Emirates', city: 'Dubai', country: 'United Arab Emirates' }],
        sourcingLocations: [{ location: 'Dubai, United Arab Emirates', city: 'Dubai', country: 'United Arab Emirates' }],
        contract: 'FULL_TIME',
        payRange: { min: 5000, max: 9000, unit: 'AED', frequency: 'monthly', isHidden: true },
        isPublic: true,
        isConfidential: false,
        workStyle: 'IN_PERSON',
        relocationRequired: false,
        version: 'v2',
        workspaceId
      }
    })
  );
  expect(createResponse.status(), await createResponse.text()).toBe(201);
  const draft = await createResponse.json();

  const publishResponse = await withApiRetry(() =>
    request.patch(`${config.apiBaseUrl}/jobs/${draft._id}/v2`, {
      headers: authHeaders(token),
      data: {
        description: `<p>${title} is a staging job created for the SQA assessment guest application flow.</p>`,
        status: 'APPROVED'
      }
    })
  );
  expect(publishResponse.status(), await publishResponse.text()).toBe(200);
  return await publishResponse.json();
}

export async function closeJob(request: APIRequestContext, token: string, jobId: string) {
  await withApiRetry(() =>
    request.patch(`${config.apiBaseUrl}/jobs/${jobId}/v2`, {
      headers: authHeaders(token),
      data: {
        status: 'CLOSED'
      }
    })
  );
}

export async function findCandidateInApplications(request: APIRequestContext, token: string, pipelineId: string, email: string) {
  const response = await withApiRetry(() =>
    request.get(`${config.apiBaseUrl}/pipelines/${pipelineId}/candidates?stageTitle=Applications&limit=10&page=1`, {
      headers: authHeaders(token)
    })
  );
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  return (body.docs ?? []).find((candidate: PipelineCandidate) => candidate.profile?.email === email) as PipelineCandidate | undefined;
}

export async function waitForCandidateInApplications(request: APIRequestContext, token: string, pipelineId: string, email: string) {
  let match: PipelineCandidate | undefined;
  await expect
    .poll(
      async () => {
        match = await findCandidateInApplications(request, token, pipelineId, email);
        return Boolean(match);
      },
      {
        timeout: 120_000,
        intervals: [2_000, 5_000, 10_000, 15_000]
      }
    )
    .toBe(true);
  return match as PipelineCandidate;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}

async function withApiRetry(call: () => Promise<APIResponse>, attempts = 3) {
  let latest: APIResponse | undefined;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    latest = await call();
    if (![502, 503, 504].includes(latest.status()) || attempt === attempts) {
      return latest;
    }
    await new Promise(resolve => setTimeout(resolve, attempt * 2_000));
  }
  return latest as APIResponse;
}
