"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@chronomint/ui";
import { useTheme } from "next-themes";
import { ROUTES } from "@chronomint/contracts";
import type { AuthSessionDto } from "@chronomint/contracts";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { useProjectsStore } from "@/stores/projects.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { WorkspaceWithRoleDto } from "@chronomint/contracts";

const nav = [
  { href: "/timer", label: "Timer" },
  { href: "/timesheet", label: "Timesheet" },
  { href: "/projects", label: "My projects" },
  { href: "/tasks", label: "Tasks" }
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, setSession, clear } = useSessionStore();
  const setWorkspaceNames = useProjectsStore((s) => s.setWorkspaces);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const { resolvedTheme, setTheme } = useTheme();
  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  useEffect(() => {
    if (session) return;
    const ws = getWorkspaceId();
    if (!ws) {
      router.replace("/login");
      return;
    }
    const token = localStorage.getItem("cm-access-token");
    if (!token) {
      router.replace("/login");
      return;
    }
    api<AuthSessionDto>(ROUTES.AUTH.ME, { workspaceId: ws })
      .then((s) => {
        setSession(s, token);
        return api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, { workspaceId: ws });
      })
      .then((list) => {
        setWorkspaces(list);
        setWorkspaceNames(list);
      })
      .catch(() => router.replace("/login"));
  }, [session, setSession, setWorkspaces, setWorkspaceNames, router]);

  async function logout() {
    await api(ROUTES.AUTH.LOGOUT, { method: "DELETE", workspaceId: session?.workspaceId });
    clear();
    router.push("/login");
  }

  if (!session) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-border bg-card p-4">
        <h1 className="text-lg font-bold text-primary">ChronoMint</h1>
        <p className="mt-1 text-xs text-muted-foreground">{session.user.name}</p>
        <WorkspaceSwitcher />
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-3 py-2 text-sm ${
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 pt-8">
          <Button variant="ghost" size="sm" onClick={toggle}>
            Toggle theme
          </Button>
          <Button variant="secondary" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
