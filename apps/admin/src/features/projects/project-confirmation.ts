export type ProjectConfirmAction = "deactivate" | "activate";

export function getProjectConfirmCopy(
  action: ProjectConfirmAction,
  project: { name: string }
): {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
} {
  switch (action) {
    case "deactivate":
      return {
        title: `Deactivate "${project.name}"?`,
        description:
          "Members will not be able to log time or start a timer on this project. All existing time entries on this project will become read-only until the project is activated again.",
        confirmLabel: "Deactivate",
        destructive: true
      };
    case "activate":
      return {
        title: `Activate "${project.name}"?`,
        description:
          "This project will be available for time logging again. Each task must also be active, and its category must be active, before members can log time on that task.",
        confirmLabel: "Activate",
        destructive: false
      };
  }
}
