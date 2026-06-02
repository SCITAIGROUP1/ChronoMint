# Timer feature spec

## Given
A member with an active workspace and at least one task

## When
They POST `/timer/start` with `taskId`

## Then
- Redis stores one active timer per user
- GET `/timer/active` returns elapsed seconds
- POST `/timer/stop` creates a `TimeLog` with `source: timer`
- Timer entries cannot be edited via PATCH `/timelogs/:id`
