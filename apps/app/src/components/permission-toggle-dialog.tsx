"use client";

import type { ManagedRole, PermissionCategoryDto } from "@kloqra/contracts";
import { PERMISSION_METADATA } from "@kloqra/contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@kloqra/ui";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  FolderKanban,
  Shield,
  ShieldAlert,
  Sparkles,
  Timer
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export interface PermissionToggleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberEmail: string;
  memberRole: string;
  memberId: string;
  scope?: "organization" | "workspace";
}

const CATEGORY_ICONS: Record<PermissionCategoryDto, typeof Shield> = {
  organization: Shield,
  billing: CreditCard,
  workspaces: Building2,
  projects: FolderKanban,
  timelogs: Timer
};

const CATEGORY_TITLES: Record<PermissionCategoryDto, string> = {
  organization: "Organization & Members",
  billing: "Billing & Data Export",
  workspaces: "Workspace Management",
  projects: "Projects & Teams",
  timelogs: "Time Tracking & Reports"
};

const PRESETS: Array<{
  id: string;
  label: string;
  hint: string;
  role: ManagedRole;
}> = [
  {
    id: "admin",
    label: "Full Admin",
    hint: "All organization & workspace capabilities",
    role: "TENANT_ADMIN"
  },
  {
    id: "finance",
    label: "Finance & Billing",
    hint: "Subscription, rates, & data export",
    role: "TENANT_ADMIN"
  },
  {
    id: "pm",
    label: "Project Manager",
    hint: "Tasks, timesheets, & project teams",
    role: "PROJECT_MANAGER"
  },
  {
    id: "member",
    label: "Standard Member",
    hint: "Timelogging & assigned project view",
    role: "WORKSPACE_MEMBER"
  }
];

export function PermissionToggleDialog({
  open,
  onOpenChange,
  memberName,
  memberEmail,
  memberRole,
  scope: _scope = "organization"
}: PermissionToggleDialogProps) {
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PermissionCategoryDto>("organization");
  const [permissionStates, setPermissionStates] = useState<Record<string, boolean>>(() => {
    const states: Record<string, boolean> = {};
    for (const id of Object.keys(PERMISSION_METADATA)) {
      // Default to allowed for admin roles, restricted for standard members
      states[id] = memberRole.includes("ADMIN") || memberRole.includes("OWNER");
    }
    return states;
  });

  const categories: PermissionCategoryDto[] = [
    "organization",
    "billing",
    "workspaces",
    "projects",
    "timelogs"
  ];

  const currentPermissions = Object.values(PERMISSION_METADATA).filter(
    (m) => m.category === activeCategory
  );

  const applyPreset = (presetRole: ManagedRole) => {
    const nextStates: Record<string, boolean> = {};
    for (const [id, meta] of Object.entries(PERMISSION_METADATA)) {
      if (presetRole === "TENANT_ADMIN" || presetRole === "WORKSPACE_ADMIN") {
        nextStates[id] = true;
      } else if (presetRole === "PROJECT_MANAGER") {
        nextStates[id] = meta.category === "projects" || meta.category === "timelogs";
      } else {
        nextStates[id] = meta.category === "timelogs" && meta.actionType === "read";
      }
    }
    setPermissionStates(nextStates);
    toast.info(`Applied preset template for ${presetRole.replace("_", " ")}.`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call persistence
      await new Promise((r) => setTimeout(r, 400));
      toast.success(`Updated permission capabilities for ${memberName}.`);
      onOpenChange(false);
    } catch {
      toast.error("Could not save permission changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                Manage Permissions & Capabilities
              </DialogTitle>
              <DialogDescription>
                Customize permission switches for{" "}
                <span className="font-medium text-foreground">{memberName}</span> ({memberEmail})
              </DialogDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs capitalize">
              Role: {memberRole}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 pb-2 space-y-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              1-Click Role Presets
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto p-2.5 flex flex-col items-start text-left gap-1 hover:border-primary/50"
                onClick={() => applyPreset(preset.role)}
              >
                <span className="font-medium text-xs">{preset.label}</span>
                <span className="text-[10px] text-muted-foreground line-clamp-1">
                  {preset.hint}
                </span>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-56 border-r p-2 space-y-1 bg-muted/10 overflow-y-auto">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs font-medium transition-colors text-left ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{CATEGORY_TITLES[cat]}</span>
                </button>
              );
            })}
          </div>

          {/* Switches Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                {CATEGORY_TITLES[activeCategory]}
              </h3>
              <span className="text-xs text-muted-foreground">
                {currentPermissions.length} permissions
              </span>
            </div>

            <div className="space-y-3">
              {currentPermissions.map((meta) => {
                const allowed = permissionStates[meta.id] ?? false;
                const isHighRisk = meta.riskLevel === "high";

                return (
                  <Card
                    key={meta.id}
                    className={`border transition-colors ${allowed ? "bg-card" : "bg-muted/20 opacity-80"}`}
                  >
                    <CardContent className="p-3.5 flex items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{meta.label}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            ({meta.id})
                          </span>
                          {isHighRisk && (
                            <Badge variant="destructive" className="h-4 px-1.5 text-[9px] gap-0.5">
                              <ShieldAlert className="size-2.5" /> High Risk
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>

                      <Switch
                        checked={allowed}
                        onCheckedChange={(checked) =>
                          setPermissionStates((prev) => ({ ...prev, [meta.id]: checked }))
                        }
                        aria-label={`Toggle ${meta.label}`}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t flex items-center justify-between sm:justify-between bg-muted/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>Changes will be logged to audit history</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
              {saving ? "Saving..." : "Save Permissions"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
