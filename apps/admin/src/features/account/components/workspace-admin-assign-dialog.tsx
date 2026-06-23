import { ROUTES } from "@kloqra/contracts";
import type { InviteMemberResponseDto } from "@kloqra/contracts";
import { AppModal, Button, Input, Label } from "@kloqra/ui";
import { useState } from "react";
import { toast } from "sonner";
import { validateAssignWorkspaceAdminForm } from "../assign-workspace-admin-validation";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

type WorkspaceAdminAssignDialogProps = {
  workspaceId: string;
  workspaceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: () => void;
};

export function WorkspaceAdminAssignDialog({
  workspaceId,
  workspaceName,
  open,
  onOpenChange,
  onAssigned
}: WorkspaceAdminAssignDialogProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; name?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateAssignWorkspaceAdminForm(email, name);
    setFieldErrors(errors);
    if (errors.email || errors.name) return;

    setLoading(true);
    try {
      await api<InviteMemberResponseDto>(ROUTES.WORKSPACES.ASSIGN_ADMIN(workspaceId), {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ email: email.trim(), name: name.trim() })
      });
      toast.success(`Workspace admin invited to ${workspaceName}`);
      setEmail("");
      setName("");
      onOpenChange(false);
      onAssigned?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign workspace admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Assign workspace admin"
      description={`Invite an admin for ${workspaceName}. They will only access this workspace until invited elsewhere.`}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="assign-workspace-admin-form" disabled={loading}>
            {loading ? "Sending…" : "Send invite"}
          </Button>
        </>
      }
    >
      <form id="assign-workspace-admin-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? (
            <p className="text-xs text-destructive">{fieldErrors.email}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-name">Name</Label>
          <Input
            id="admin-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
        </div>
      </form>
    </AppModal>
  );
}
