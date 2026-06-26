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

// Canonical Status configuration for Project #8
const STATUS_FIELD_ID = 'PVTSSF_lADOEUQ_7s4BbvlGzhWd6Vc';
const STATUS_OPTIONS = {
  'backlog': 'f75ad846',         // Todo
  'ticket_written': 'f75ad846',  // Todo
  'in_sprint': 'f75ad846',        // Todo
  'in_progress': '47fc9ee4',     // In Progress
  'in_review': '47fc9ee4',       // In Progress
  'review_approved': '47fc9ee4', // In Progress
  'qa_passed': '47fc9ee4',       // In Progress
  'released': '98236657',        // Done
  'completed': '98236657'        // Done
};

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

// 3. Update Status Field Value
async function updateItemStatus(projectId, itemId, status) {
  const optionId = STATUS_OPTIONS[status.toLowerCase()];
  if (!optionId) {
    throw new Error(`Invalid status key: "${status}". Supported: ${Object.keys(STATUS_OPTIONS).join(', ')}`);
  }

  const query = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: {
          singleSelectOptionId: $optionId
        }
      }) {
        projectV2Item {
          id
        }
      }
    }
  `;
  
  await fetchGraphQL(query, {
    projectId,
    itemId,
    fieldId: STATUS_FIELD_ID,
    optionId
  });
}

// Main CLI execution
async function main() {
  const args = process.argv.slice(2);
  let action = 'add'; // 'add' or 'update'
  let title = '';
  let body = '';
  let itemId = '';
  let status = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      title = args[i + 1];
      i++;
    } else if (args[i] === '--body' && args[i + 1]) {
      body = args[i + 1];
      i++;
    } else if (args[i] === '--itemId' && args[i + 1]) {
      itemId = args[i + 1];
      action = 'update';
      i++;
    } else if (args[i] === '--status' && args[i + 1]) {
      status = args[i + 1];
      action = 'update';
      i++;
    }
  }

  try {
    const projectId = await getProjectId();

    if (action === 'add') {
      if (!title || !body) {
        console.log('Usage (Add): node github_project_sync.js --title "Title" --body "Body"');
        process.exit(1);
      }
      console.log(`Connecting to GitHub Project #${PROJECT_NUMBER} under ${ORG}...`);
      console.log(`Adding Draft Item: "${title}"...`);
      const newItemId = await addDraftIssue(projectId, title, body);
      console.log(`Successfully added item! ID: ${newItemId}`);
      // Output the ID cleanly so calling scripts can capture it
      console.log(`__ITEM_ID__:${newItemId}`);
    } else if (action === 'update') {
      if (!itemId || !status) {
        console.log('Usage (Update): node github_project_sync.js --itemId "item-id" --status "released"');
        process.exit(1);
      }
      console.log(`Updating Item ${itemId} status to "${status}"...`);
      await updateItemStatus(projectId, itemId, status);
      console.log(`Successfully updated item status!`);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  }
}

main();
