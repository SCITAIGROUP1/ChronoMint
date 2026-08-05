"use client";

import { ROUTES, type CategoryDto, type ProjectDto, type TaskDto } from "@kloqra/contracts";
import { AppModal, Button, Input, Label, SearchableSelect } from "@kloqra/ui";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  projects: ProjectDto[];
  categories: CategoryDto[];
  editingTask?: TaskDto | null;
  defaultProjectId?: string;
  onSaved: () => void;
};

export function TaskFormDialog({
  open,
  onOpenChange,
  workspaceId,
  projects,
  categories,
  editingTask,
  defaultProjectId,
  onSaved
}: Props) {
  const activeCategories = useMemo(() => categories.filter((c) => c.isActive), [categories]);
  const activeProjects = useMemo(() => projects.filter((p) => p.isActive !== false), [projects]);
  const [projectId, setProjectId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [billable, setBillable] = useState(true);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(editingTask);

  useEffect(() => {
    if (!open) return;
    if (editingTask) {
      setProjectId(editingTask.projectId);
      setTaskName(editingTask.taskName);
      setCategoryId(editingTask.categoryId);
      setBillable(editingTask.billableDefault);
      return;
    }
    setProjectId(defaultProjectId ?? activeProjects[0]?.id ?? "");
    setTaskName("");
    setCategoryId(activeCategories[0]?.id ?? "");
    setBillable(true);
  }, [open, editingTask, defaultProjectId, activeProjects, activeCategories]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!taskName.trim() || !categoryId || (!isEdit && !projectId)) return;
    setSaving(true);
    try {
      if (editingTask) {
        await api(ROUTES.TASKS.BY_ID(editingTask.id), {
          method: "PATCH",
          workspaceId,
          body: JSON.stringify({
            taskName: taskName.trim(),
            categoryId,
            billableDefault: billable,
            isCommon: true,
            assigneeUserIds: []
          })
        });
        toast.success("Task updated.");
      } else {
        await api(ROUTES.TASKS.CREATE, {
          method: "POST",
          workspaceId,
          body: JSON.stringify({
            projectId,
            categoryId,
            taskName: taskName.trim(),
            billableDefault: billable,
            isCommon: true,
            assigneeUserIds: []
          })
        });
        toast.success("Task created.");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit task" : "Add task"}
      description={
        isEdit
          ? "Update this common task. Assignees are managed on the project Tasks tab."
          : "Creates a common task available to the whole project team."
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="task-form-dialog"
            disabled={saving || !taskName.trim() || !categoryId || (!isEdit && !projectId)}
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create task"}
          </Button>
        </>
      }
    >
      <form id="task-form-dialog" onSubmit={submit} className="space-y-4">
        {!isEdit ? (
          <div className="space-y-2">
            <Label htmlFor="task-form-project">Project</Label>
            <SearchableSelect
              id="task-form-project"
              value={projectId}
              onValueChange={setProjectId}
              options={activeProjects.map((project) => ({
                value: project.id,
                label: project.name
              }))}
              placeholder="Select project"
              searchPlaceholder="Search projects…"
              aria-label="Project"
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="task-form-name">Task name</Label>
          <Input
            id="task-form-name"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            maxLength={200}
            placeholder="e.g. K8s rollout"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-form-category">Category</Label>
          <SearchableSelect
            id="task-form-category"
            value={categoryId}
            onValueChange={setCategoryId}
            options={activeCategories.map((category) => ({
              value: category.id,
              label: category.name
            }))}
            placeholder="Select category"
            searchPlaceholder="Search categories…"
            aria-label="Category"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border border-input accent-primary"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
          />
          <span>Billable by default</span>
        </label>
      </form>
    </AppModal>
  );
}
