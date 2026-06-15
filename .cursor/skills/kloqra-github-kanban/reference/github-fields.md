# GitHub Project #4 setup

## One-time (UI or gh)

1. Link repo `SCITAIGROUP1/ChronoMint` to org project 4
2. Create Status field with single-select options (order matters):

   `backlog`, `ready`, `on-hold`, `in-progress`, `in-review`, `ready-for-qa`, `qa-in-progress`, `testing`, `qa-failed`, `done`

3. Optional fields: Work item type, Feature domain, Priority, Owner role

## Labels (repo)

```bash
REPO=SCITAIGROUP1/ChronoMint
for l in "type:epic" "type:story" "type:task" "type:bug" \
  "feature:auth" "feature:timer" "feature:export" "feature:platform" \
  "layer:api" "layer:client" "layer:admin" "layer:contracts" \
  "role:BA" "role:LSA" "role:BE" "role:FE" "role:QA" \
  "priority:P0" "priority:P1" "priority:P2" "priority:P3" \
  "mvp:out-of-scope" "health:shipped" "health:gap"; do
  gh label create "$l" --repo "$REPO" --force 2>/dev/null || true
done
```

## Post issue + add to project

```bash
ISSUE_URL=$(gh issue create --repo SCITAIGROUP1/ChronoMint \
  --title "[Story][F-12] Wire member timesheet CSV export" \
  --label "type:story,feature:export,layer:client,role:FE,priority:P1" \
  --body-file docs/agent/backlog/bodies/f-12-export.md)
gh project item-add 4 --owner SCITAIGROUP1 --url "$ISSUE_URL"
```

Set Status via GitHub Project UI or `gh project item-edit` once field IDs are captured.

## Views

- **Main Kanban** — group by Status (10 lanes)
- **By feature** — group by Feature domain
- **QA queue** — filter Status in `ready-for-qa`, `qa-in-progress`, `testing`, `qa-failed` — see [kloqra-qa-workflow skill](../../kloqra-qa-workflow/SKILL.md)
