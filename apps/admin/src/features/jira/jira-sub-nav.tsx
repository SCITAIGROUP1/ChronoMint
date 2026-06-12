"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/jira/settings", label: "Settings" },
  { href: "/jira/projects", label: "Projects" },
  { href: "/jira/issues", label: "Issues" },
  { href: "/jira/users", label: "Users" },
  { href: "/jira/worklogs", label: "Worklogs" },
  { href: "/jira/logs", label: "Sync Logs" }
];

export function JiraSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b pb-0">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
