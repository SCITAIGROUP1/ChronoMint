"use client";

import {
  createPlatformTenantSchema,
  ROUTES,
  type CreatePlatformTenantDto,
  type CreatePlatformTenantResponseDto
} from "@kloqra/contracts";
import { AppBar, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@kloqra/ui";
import { api, usePlatformPlans } from "@kloqra/web-shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function TenantCreatePage() {
  const router = useRouter();
  const { plans, loading: plansLoading } = usePlatformPlans();
  const [organizationName, setOrganizationName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [planId, setPlanId] = useState("");
  const [trial, setTrial] = useState(true);
  const [firstWorkspaceName, setFirstWorkspaceName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPlanId = planId || plans[0]?.id || "";

  const payload = useMemo((): CreatePlatformTenantDto | null => {
    const body: CreatePlatformTenantDto = {
      organizationName: organizationName.trim(),
      ownerEmail: ownerEmail.trim(),
      planId: selectedPlanId,
      subscriptionStatus: trial ? "trial" : "active",
      ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
      ...(firstWorkspaceName.trim() ? { firstWorkspace: { name: firstWorkspaceName.trim() } } : {})
    };
    const parsed = createPlatformTenantSchema.safeParse(body);
    return parsed.success ? parsed.data : null;
  }, [firstWorkspaceName, organizationName, ownerEmail, ownerName, selectedPlanId, trial]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!payload) {
      setError("Fill in organization name, owner email, and plan.");
      return;
    }
    setSaving(true);
    try {
      const result = await api<CreatePlatformTenantResponseDto>(ROUTES.PLATFORM.TENANTS, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      router.push(`/tenants/${result.tenant.id}`);
    } catch {
      setError("Failed to create tenant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <AppBar
        title="Create tenant"
        description="Provision a new organization, owner account, and optional first workspace."
        actions={
          <Link href="/tenants" className="text-sm text-primary hover:underline">
            Back to list
          </Link>
        }
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Provision organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-email">Owner email</Label>
              <Input
                id="owner-email"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-name">Owner name (optional)</Label>
              <Input
                id="owner-name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <select
                id="plan"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedPlanId}
                onChange={(e) => setPlanId(e.target.value)}
                disabled={plansLoading}
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.slug})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="trial"
                type="checkbox"
                checked={trial}
                onChange={(e) => setTrial(e.target.checked)}
                className="h-4 w-4 rounded border border-input"
              />
              <div>
                <Label htmlFor="trial">Start on trial</Label>
                <p className="text-xs text-muted-foreground">
                  Otherwise subscription is active immediately.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-name">First workspace (optional)</Label>
              <Input
                id="workspace-name"
                value={firstWorkspaceName}
                onChange={(e) => setFirstWorkspaceName(e.target.value)}
                placeholder="Main workspace"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={saving || !payload}>
              {saving ? "Creating…" : "Create tenant"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
