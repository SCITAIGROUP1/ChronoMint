import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

const catalogItem = {
  id: "workspace:ManageMembers",
  label: "Manage Workspace Members",
  description: "Invite, update, and remove workspace members.",
  resourceScope: "workspace",
  resourceFamily: "workspace",
  parentGroup: "Member administration",
  actionDimension: "EDIT",
  riskLevel: "high",
  customizable: true,
  applicableTargetRoles: ["WORKSPACE_ADMIN", "TENANT_OWNER"],
  lifecycle: "retained",
  enforcementStatus: "enforced"
};

async function mockStudio(page: Page, options?: { conflictOnce?: boolean; owner?: boolean }) {
  let configured: "INHERIT" | "ALLOW" | "DENY" = "INHERIT";
  let revision = 3;
  let conflict = options?.conflictOnce ?? false;
  const role = options?.owner ? ("TENANT_OWNER" as const) : ("WORKSPACE_ADMIN" as const);
  const scope = options?.owner ? ("tenant" as const) : ("workspace" as const);

  await page.route("**/tenants/current/permission-policies/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const resourceId = url.searchParams.get("resourceId") ?? "resource-1";
    const activeTarget = {
      type: "ROLE" as const,
      role,
      scope,
      resourceId
    };

    if (path.endsWith("/permission-policies/catalog")) {
      await route.fulfill({ json: [catalogItem] });
      return;
    }

    if (path.endsWith("/permission-policies/roles") && request.method() === "GET") {
      await route.fulfill({
        json: {
          items: [
            {
              target: activeTarget,
              displayName: options?.owner ? "Organization owner" : "Workspace admin",
              immutable: Boolean(options?.owner),
              customizationEnabled: !options?.owner,
              overrideCount: 0
            }
          ],
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1
        }
      });
      return;
    }

    if (path.endsWith("/permission-policies/principals") && request.method() === "GET") {
      await route.fulfill({
        json: {
          items: [
            {
              target: {
                type: "PRINCIPAL",
                principalId: "user-wa",
                scope: "workspace",
                resourceId: "workspace-1"
              },
              displayName: "Casey Workspace Admin",
              email: "casey@example.com",
              active: true,
              roles: ["WORKSPACE_ADMIN"],
              overrideCount: 0
            },
            {
              target: {
                type: "PRINCIPAL",
                principalId: "user-pm",
                scope: "project",
                resourceId: "project-1"
              },
              displayName: "Alex Project Manager",
              email: "alex@example.com",
              active: true,
              roles: ["PROJECT_MANAGER"],
              overrideCount: 0
            }
          ],
          page: 1,
          limit: 100,
          total: 2,
          totalPages: 1
        }
      });
      return;
    }

    if (path.includes(`/permission-policies/roles/${role}`) && request.method() === "GET") {
      await route.fulfill({
        json: {
          policyVersion: "v2",
          policyChecksum: `sha256:${"a".repeat(64)}`,
          revision,
          target: activeTarget,
          items: [
            {
              permission: catalogItem.id,
              target: activeTarget,
              configured,
              effective: configured === "ALLOW" ? "ALLOW" : "DENY",
              source: configured === "INHERIT" ? "DEFAULT_DENY" : "ROLE_POLICY",
              reason: "Resolved by mocked policy"
            }
          ]
        }
      });
      return;
    }

    if (path.endsWith("/permission-policies/batch") && request.method() === "PATCH") {
      if (conflict) {
        conflict = false;
        revision += 1;
        await route.fulfill({
          status: 409,
          json: {
            code: "POLICY_CONFLICT",
            message: "Revision conflict",
            expectedRevision: revision - 1,
            actualRevision: revision,
            conflicts: [
              {
                field: "revision",
                expected: revision - 1,
                actual: revision,
                message: "Revision changed"
              }
            ]
          }
        });
        return;
      }
      const body = request.postDataJSON() as {
        mutations: Array<{ configured: "INHERIT" | "ALLOW" | "DENY" }>;
      };
      configured = body.mutations[0].configured;
      revision += 1;
      await route.fulfill({
        json: {
          policyVersion: "v2",
          previousRevision: revision - 1,
          revision,
          target: activeTarget,
          items: [
            {
              permission: catalogItem.id,
              target: activeTarget,
              configured,
              effective: configured === "ALLOW" ? "ALLOW" : "DENY",
              source: configured === "INHERIT" ? "DEFAULT_DENY" : "ROLE_POLICY"
            }
          ]
        }
      });
      return;
    }

    await route.continue();
  });
}

test.describe("Production Permission Studio", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("cycles inherit to allow to deny to inherit and saves a batch", async ({ page }) => {
    await mockStudio(page);
    await page.goto("/account/permissions-matrix?view=roles&target=WORKSPACE_ADMIN");
    const control = page.getByRole("radiogroup", { name: "Configure Manage Workspace Members" });
    await control.getByRole("radio", { name: "Allow" }).click();
    await control.getByRole("radio", { name: "Deny" }).click();
    await control.getByRole("radio", { name: "Inherit" }).click();
    await control.getByRole("radio", { name: "Allow" }).click();
    await page.getByRole("button", { name: "Review 1 change" }).click();
    await page.getByLabel("Reason for change").fill("Approved access request");
    await page.getByRole("button", { name: "Save batch" }).click();
    await page.getByRole("button", { name: "Confirm and save" }).click();
    await expect(page.getByText("1 permission changes saved.").first()).toBeVisible({
      timeout: 15_000
    });
  });

  test("recovers from an optimistic revision conflict", async ({ page }) => {
    await mockStudio(page, { conflictOnce: true });
    await page.goto("/account/permissions-matrix?view=roles&target=WORKSPACE_ADMIN");
    await page.getByRole("radio", { name: "Allow" }).click();
    await page.getByRole("button", { name: "Review 1 change" }).click();
    await page.getByLabel("Reason for change").fill("Approved access request");
    await page.getByRole("button", { name: "Save batch" }).click();
    await page.getByRole("button", { name: "Confirm and save" }).click();
    await expect(
      page.getByText(/Revision conflict detected|changed in another session/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("renders the owner template immutable", async ({ page }) => {
    await mockStudio(page, { owner: true });
    await page.goto("/account/permissions-matrix?view=roles&target=TENANT_OWNER");
    await expect(page.getByText("Read only")).toBeVisible();
    await expect(page.getByRole("radio", { name: "Deny" })).toBeDisabled();
  });

  test("keeps member search visible beside the view toggle", async ({ page }) => {
    await mockStudio(page);
    await page.goto("/account/permissions-matrix?view=members");
    await expect(page.getByRole("searchbox", { name: /Search members/i })).toBeVisible();
    await expect(page.getByText("People with access")).toBeVisible();
    await expect(page.getByRole("button", { name: /Casey Workspace Admin/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Alex Project Manager/i })).toBeVisible();
  });
});
