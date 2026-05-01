import { appendFile } from 'node:fs/promises';

const {
  GITHUB_REPOSITORY,
  GITHUB_RUN_ID,
  GITHUB_SERVER_URL = 'https://github.com',
  GITHUB_WORKFLOW = 'Deployment',
  GITHUB_REF_NAME,
  GITHUB_SHA,
  GITHUB_TOKEN,
  GITHUB_STEP_SUMMARY,
  DEPLOYMENT_URL,
  SLACK_WEBHOOK_URL,
  CREATE_GITHUB_ISSUE_ON_FAILURE,
} = process.env;

const runUrl = GITHUB_REPOSITORY && GITHUB_RUN_ID
  ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
  : undefined;

const title = `Deployment failure: ${GITHUB_WORKFLOW}`;
const messageLines = [
  `Deployment failure detected in ${GITHUB_WORKFLOW}.`,
  GITHUB_REPOSITORY ? `Repository: ${GITHUB_REPOSITORY}` : undefined,
  GITHUB_REF_NAME ? `Branch/ref: ${GITHUB_REF_NAME}` : undefined,
  GITHUB_SHA ? `Commit: ${GITHUB_SHA}` : undefined,
  DEPLOYMENT_URL ? `Deployment URL: ${DEPLOYMENT_URL}` : undefined,
  runUrl ? `Workflow run: ${runUrl}` : undefined,
].filter(Boolean);

const message = messageLines.join('\n');

async function writeSummary() {
  if (!GITHUB_STEP_SUMMARY) return;
  await appendFile(GITHUB_STEP_SUMMARY, [
    '## Deployment failure',
    '',
    ...messageLines.map((line) => `- ${line}`),
    '',
  ].join('\n'));
}

async function notifySlack() {
  if (!SLACK_WEBHOOK_URL) {
    console.log('SLACK_WEBHOOK_URL is not configured; relying on GitHub Actions failure notifications.');
    return;
  }

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });

  if (!response.ok) {
    console.warn(`Slack notification failed with HTTP ${response.status}.`);
  }
}

async function upsertGithubIssue() {
  if (CREATE_GITHUB_ISSUE_ON_FAILURE === 'false') return;
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    console.log('GITHUB_TOKEN or GITHUB_REPOSITORY is not available; skipping GitHub issue notification.');
    return;
  }

  const apiBase = 'https://api.github.com';
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'maji-safi-deployment-notifier/1.0',
  };

  const openIssuesResponse = await fetch(`${apiBase}/repos/${GITHUB_REPOSITORY}/issues?state=open&per_page=50`, { headers });
  if (!openIssuesResponse.ok) {
    console.warn(`Could not list GitHub issues: HTTP ${openIssuesResponse.status}.`);
    return;
  }

  const openIssues = await openIssuesResponse.json();
  const existing = openIssues.find((issue) => issue.title === title && !issue.pull_request);

  if (existing) {
    const commentResponse = await fetch(`${apiBase}/repos/${GITHUB_REPOSITORY}/issues/${existing.number}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body: message }),
    });
    if (!commentResponse.ok) {
      console.warn(`Could not comment on GitHub issue: HTTP ${commentResponse.status}.`);
    }
    return;
  }

  const createResponse = await fetch(`${apiBase}/repos/${GITHUB_REPOSITORY}/issues`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title,
      body: message,
    }),
  });

  if (!createResponse.ok) {
    console.warn(`Could not create GitHub issue: HTTP ${createResponse.status}.`);
  }
}

await writeSummary();
await notifySlack();
await upsertGithubIssue();
console.log(message);

