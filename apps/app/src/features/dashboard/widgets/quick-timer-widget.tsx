"use client";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { Pause, Play, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DashboardProject, DashboardTask } from "./personal-widget-data";
import { useTimerActions } from "@/features/timer/use-timer-actions";
import { isActiveTimer, useTimerStore } from "@/stores/timer.store";

function formatElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours, minutes, secs].map((part) => String(part).padStart(2, "0")).join(":");
}

export function QuickTimerWidget({
  workspaceId,
  projects,
  tasks
}: {
  workspaceId: string;
  projects: DashboardProject[];
  tasks: DashboardTask[];
}) {
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const { active, elapsedSec, tick } = useTimerStore();
  const actions = useTimerActions(workspaceId);
  const tracking = isActiveTimer(active);
  const activeTask = tracking ? tasks.find((task) => task.id === active.taskId) : undefined;
  const activeProject = activeTask
    ? projects.find((project) => project.id === activeTask.projectId)
    : undefined;
  const availableTasks = useMemo(
    () => tasks.filter((task) => task.projectId === projectId),
    [tasks, projectId]
  );

  useEffect(() => {
    if (!tracking || active.isPaused) return;
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [tracking, active?.isPaused, tick]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  if (tracking) {
    return (
      <div className="flex h-full min-h-48 flex-col justify-center gap-4">
        <div className="text-center">
          <p className="truncate text-sm font-semibold">{activeProject?.name ?? "Active timer"}</p>
          <p className="truncate text-xs text-muted-foreground">{activeTask?.taskName}</p>
          <p className="mt-3 font-mono text-3xl font-semibold tabular-nums">
            {formatElapsed(elapsedSec)}
          </p>
        </div>
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional stop note"
          disabled={busy || actions.disabled}
        />
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={busy || actions.disabled}
            onClick={() => void run(() => (active.isPaused ? actions.resume() : actions.pause()))}
          >
            {active.isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {active.isPaused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="destructive"
            disabled={busy || actions.disabled}
            onClick={() =>
              void run(() =>
                actions.stop({
                  description: description.trim() || undefined,
                  isBillable: activeTask?.billableDefault ?? true
                })
              )
            }
          >
            <Square className="size-4" />
            Stop
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-48 flex-col justify-center gap-3">
      <Select
        value={projectId}
        onValueChange={(value) => {
          setProjectId(value);
          setTaskId("");
        }}
      >
        <SelectTrigger aria-label="Quick timer project">
          <SelectValue placeholder="Choose project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={taskId} onValueChange={setTaskId} disabled={!projectId}>
        <SelectTrigger aria-label="Quick timer task">
          <SelectValue placeholder="Choose task" />
        </SelectTrigger>
        <SelectContent>
          {availableTasks.map((task) => (
            <SelectItem key={task.id} value={task.id}>
              {task.categoryName ? `${task.categoryName} · ` : ""}
              {task.taskName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        disabled={!taskId || busy || actions.disabled}
        onClick={() => void run(() => actions.start(taskId))}
      >
        <Play className="size-4" />
        {busy ? "Starting…" : "Start timer"}
      </Button>
    </div>
  );
}
