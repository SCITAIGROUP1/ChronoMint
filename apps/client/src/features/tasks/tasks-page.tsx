"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ProjectColorDot,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@chronomint/ui";
import { ROUTES } from "@chronomint/contracts";
import type { TaskDto, ProjectDto } from "@chronomint/contracts";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { useProjectsStore } from "@/stores/projects.store";
import { formatProjectLabel } from "@/lib/project-labels";

export function TasksPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { tasks, projects, workspaceNamesById, setTasks, setProjects } = useProjectsStore();
  const [projectId, setProjectId] = useState("");
  const [taskName, setTaskName] = useState("");

  useEffect(() => {
    api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
    api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId: ws }).then(setTasks);
  }, [ws, setProjects, setTasks]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api(ROUTES.TASKS.CREATE, {
      method: "POST",
      workspaceId: ws,
      body: JSON.stringify({ projectId, taskName })
    });
    setTasks(await api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId: ws }));
    setTaskName("");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New task</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <ProjectColorDot color={p.color} />
                        {formatProjectLabel(p, workspaceNamesById)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskName">Task name</Label>
              <Input
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                required
              />
            </div>
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.taskName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
