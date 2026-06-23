"use client";

import { ROUTES, type PlatformTenantDetailDto } from "@kloqra/contracts";
import {
  AppBar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label
} from "@kloqra/ui";
import { api } from "@kloqra/web-shared";
import Link from "next/link";
import { useEffect, useState } from "react";

export function TenantDetailPage({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<PlatformTenantDetailDto | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [planId, setPlanId] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  async function loadTenant() {
    const data = await api<PlatformTenantDetailDto>(ROUTES.PLATFORM.TENANT(tenantId));
    setTenant(data);
    setName(data.name);
    setSlug(data.slug);
  }

  useEffect(() => {
    void loadTenant().catch(() => setError("Failed to load tenant"));
  }, [tenantId]);

  async function patchTenant(body: Record<string, unknown>) {
    setSaving(true);
    setActionMessage("");
    setError("");
    try {
      const updated = await api<PlatformTenantDetailDto>(ROUTES.PLATFORM.TENANT(tenantId), {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      setTenant(updated);
      setName(updated.name);
      setSlug(updated.slug);
      setActionMessage("Tenant updated.");
    } catch {
      setError("Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function suspendTenant() {
    setSaving(true);
    setError("");
    try {
      const updated = await api<PlatformTenantDetailDto>(ROUTES.PLATFORM.SUSPEND_TENANT(tenantId), {
        method: "POST"
      });
      setTenant(updated);
      setActionMessage("Tenant suspended.");
    } catch {
      setError("Suspend failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTenantPermanently() {
    if (
      !window.confirm(
        "Permanently delete this organization and all data? This cannot be undone. Export must be completed or waived and retention period must have elapsed."
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api(ROUTES.PLATFORM.TENANT_DELETE(tenantId), { method: "DELETE" });
      window.location.assign("/tenants");
    } catch {
      setError("Delete failed. Check export, churn, and retention preconditions.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !tenant) {
    return <p className="p-6 text-sm text-destructive">{error}</p>;
  }

  if (!tenant) {
    return <p className="p-6 text-sm text-muted-foreground">Loading tenant…</p>;
  }

  return (
    <div className="space-y-6 p-6">
      <AppBar
        title={tenant.name}
        description={`Organization slug: ${tenant.slug}`}
        actions={
          <div className="flex items-center gap-3">
            <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
              {tenant.status}
            </Badge>
            <Link href="/tenants" className="text-sm text-primary hover:underline">
              Back to list
            </Link>
          </div>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {actionMessage ? <p className="text-sm text-muted-foreground">{actionMessage}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Owner email:</span> {tenant.ownerEmail ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Workspaces:</span> {tenant.workspaceCount}
            </p>
            <p>
              <span className="text-muted-foreground">Members:</span> {tenant.memberCount}
            </p>
            <p>
              <span className="text-muted-foreground">Created:</span>{" "}
              {new Date(tenant.createdAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {tenant.subscription ? (
              <>
                <p>
                  <span className="text-muted-foreground">Plan:</span>{" "}
                  {tenant.subscription.planName}
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  {tenant.subscription.status}
                </p>
                {tenant.subscription.billingAlert ? (
                  <p>
                    <span className="text-muted-foreground">Billing alert:</span>{" "}
                    {tenant.subscription.billingAlert}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">No subscription</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Platform actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Name</Label>
              <Input id="tenant-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-slug">Slug</Label>
              <Input id="tenant-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-id">Plan ID override</Label>
            <Input
              id="plan-id"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              placeholder="Plan UUID (optional)"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={saving}
              onClick={() =>
                void patchTenant({
                  name: name.trim(),
                  slug: slug.trim(),
                  ...(planId.trim() ? { planId: planId.trim() } : {})
                })
              }
            >
              Save changes
            </Button>
            {tenant.status !== "suspended" && tenant.status !== "churned" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={() => void suspendTenant()}
              >
                Suspend tenant
              </Button>
            ) : null}
            {tenant.status === "suspended" ? (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void patchTenant({ status: "active", subscriptionStatus: "active" })}
              >
                Reactivate
              </Button>
            ) : null}
            {tenant.status === "suspended" ? (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void patchTenant({ status: "churned" })}
              >
                Mark churned
              </Button>
            ) : null}
            {tenant.status === "churned" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={() => void deleteTenantPermanently()}
                data-testid="platform-delete-tenant"
              >
                Delete permanently
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
