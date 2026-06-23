"use client";

import {
  AppBar,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CenteredLoader,
  Input,
  Label
} from "@kloqra/ui";
import { useTenantCurrent, useUpdateTenantCurrent } from "@kloqra/web-shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AccountOrganizationPage() {
  const router = useRouter();
  const { tenant, loading, error, reload } = useTenantCurrent();
  const { updateTenantCurrent, saving, error: saveError } = useUpdateTenantCurrent();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [formError, setFormError] = useState("");

  const pendingSetup = tenant?.status === "pending_setup";

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name);
    setSlug(tenant.slug);
  }, [tenant]);

  async function completeSetup(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!name.trim() || !slug.trim()) {
      setFormError("Organization name and slug are required.");
      return;
    }
    try {
      const updated = await updateTenantCurrent({ name: name.trim(), slug: slug.trim() });
      await reload();
      if (updated.status === "active") {
        router.push("/account");
      }
    } catch {
      setFormError("Could not save organization profile.");
    }
  }

  if (loading) return <CenteredLoader label="Loading organization…" />;
  if (error || !tenant) {
    return (
      <div className="p-6 text-sm text-destructive">{error ?? "Organization unavailable"}</div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <AppBar
        title="Organization"
        description={
          pendingSetup
            ? "Complete your organization profile to activate your account."
            : "Your organization profile."
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{pendingSetup ? "Finish setup" : tenant.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {pendingSetup ? (
            <form onSubmit={completeSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Slug</Label>
                <Input
                  id="org-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </div>
              {formError || saveError ? (
                <p className="text-destructive">{formError || saveError}</p>
              ) : null}
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Activate organization"}
              </Button>
            </form>
          ) : (
            <>
              <div>
                <span className="text-muted-foreground">Slug</span>
                <p className="font-mono">{tenant.slug}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p>{tenant.status}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
