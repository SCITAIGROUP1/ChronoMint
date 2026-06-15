# MVP feature domains

| ID   | Domain           | API                     | Client                 | Admin               | Spec                |
| ---- | ---------------- | ----------------------- | ---------------------- | ------------------- | ------------------- |
| F-01 | Auth             | `modules/auth`          | `(auth)/*`             | `login`             | `auth-workspace.md` |
| F-02 | Users            | `modules/users`         | profile/settings       | profile/settings    | `user-profile.md`   |
| F-03 | Workspace        | `modules/workspace`     | shell                  | `workspace`         | `auth-workspace.md` |
| F-04 | Projects         | `modules/projects`      | `features/projects`    | `features/projects` | `projects.md`       |
| F-05 | Categories/tasks | `categories`, `tasks`   | tasks tab              | categories          | `projects.md`       |
| F-06 | Timer            | `modules/timer`         | `features/timer`       | —                   | `timer.md`          |
| F-07 | Timelogs         | `modules/timelogs`      | `time-tracker`         | —                   | `timelogs.md`       |
| F-08 | Timesheets       | timesheets ctrl         | submissions, timesheet | approvals           | `timelogs.md`       |
| F-09 | Billing          | `modules/billing`       | —                      | billing             | **OUT OF MVP**      |
| F-10 | Reporting        | `modules/reporting`     | dashboard              | dashboard           | `reporting.md`      |
| F-11 | Presence         | `modules/presence`      | —                      | team live           | `presence.md`       |
| F-12 | Export (hours)   | `modules/export`        | `timesheet-export.tsx` | exports             | `export.md`         |
| F-13 | Notifications    | `modules/notifications` | inbox                  | inbox               | timelogs spec       |
| F-14 | Assistant        | `modules/assistant`     | assistant              | —                   | `assistant.md`      |
| F-15 | Onboarding       | —                       | onboarding             | —                   | —                   |
| F-X  | Platform         | contracts, CI           | —                      | —                   | api audit plan      |
