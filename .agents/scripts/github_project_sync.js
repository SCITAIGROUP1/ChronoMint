#!/usr/bin/env node
/* eslint-disable */

const fs = require('fs');
const path = require('path');

// Helper to load env variables from root .env
function loadEnv() {
  const envPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove surrounding quotes if present
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error('❌ Error: GITHUB_TOKEN is not defined in your .env file.');
  process.exit(1);
}

const ORG = 'SCITAIGROUP1';
const PROJECT_NUMBER = 8;

async function fetchGraphQL(query, variables = {}) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'Kloqra-Agent-Orchestrator'
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await response.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

// 1. Get Project Node ID
async function getProjectId() {
  const query = `
    query($org: String!, $number: Int!) {
      organization(login: $org) {
        projectV2(number: $number) {
          id
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { org: ORG, number: PROJECT_NUMBER });
  if (!data.organization || !data.organization.projectV2) {
    throw new Error(`Project #${PROJECT_NUMBER} not found under Org ${ORG}`);
  }
  return data.organization.projectV2.id;
}

// 2. Add Draft Issue to Project
async function addDraftIssue(projectId, title, body) {
  const query = `
    mutation($projectId: ID!, $title: String!, $body: String!) {
      addProjectV2DraftIssue(input: {projectId: $projectId, title: $title, body: $body}) {
        projectItem {
          id
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { projectId, title, body });
  return data.addProjectV2DraftIssue.projectItem.id;
}

// Main CLI execution
async function main() {
  const args = process.argv.slice(2);
  let title = '';
  let body = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      title = args[i + 1];
      i++;
    } else if (args[i] === '--body' && args[i + 1]) {
      body = args[i + 1];
      i++;
    }
  }

  if (!title || !body) {
    console.log('Usage: node github_project_sync.js --title "Issue Title" --body "Issue Body"');
    process.exit(1);
  }

  try {
    console.log(`Connecting to GitHub Project #${PROJECT_NUMBER} under ${ORG}...`);
    const projectId = await getProjectId();
    console.log(`Adding Draft Item: "${title}"...`);
    const itemId = await addDraftIssue(projectId, title, body);
    console.log(`Successfully added item! ID: ${itemId}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  }
}

main();
