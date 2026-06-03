/** Supplemental demo users and projects — merged in seed.ts */

export type SeedUserSpec = {
  email: string;
  name: string;
  defaultHourlyRate: number;
  role: "ADMIN" | "MEMBER";
};

export type SeedProjectSpec = {
  name: string;
  color: string;
  clientName: string | null;
  budgetHours: number | null;
  budgetBurnPct?: number;
  tasks: { name: string; billableDefault: boolean }[];
  memberEmails: string[];
};

export const CORE_USERS: SeedUserSpec[] = [
  { email: "admin@chronomint.dev", name: "Admin User", defaultHourlyRate: 150, role: "ADMIN" },
  { email: "ops@chronomint.dev", name: "Morgan Blake", defaultHourlyRate: 140, role: "ADMIN" },
  { email: "member@chronomint.dev", name: "Sam Rivera", defaultHourlyRate: 100, role: "MEMBER" },
  { email: "alex@chronomint.dev", name: "Alex Chen", defaultHourlyRate: 95, role: "MEMBER" },
  { email: "jordan@chronomint.dev", name: "Jordan Lee", defaultHourlyRate: 110, role: "MEMBER" },
  { email: "taylor@chronomint.dev", name: "Taylor Brooks", defaultHourlyRate: 88, role: "MEMBER" },
  { email: "riley@chronomint.dev", name: "Riley Kim", defaultHourlyRate: 105, role: "MEMBER" },
  { email: "casey@chronomint.dev", name: "Casey Nguyen", defaultHourlyRate: 92, role: "MEMBER" },
  { email: "jamie@chronomint.dev", name: "Jamie Ortiz", defaultHourlyRate: 98, role: "MEMBER" },
  { email: "onboarding@chronomint.dev", name: "Pat Harper", defaultHourlyRate: 85, role: "MEMBER" },
  { email: "contractor@chronomint.dev", name: "Quinn Ellis", defaultHourlyRate: 120, role: "MEMBER" }
];

export const EXTRA_USERS: SeedUserSpec[] = [
  { email: "drew@chronomint.dev", name: "Drew Martinez", defaultHourlyRate: 102, role: "MEMBER" },
  { email: "sage@chronomint.dev", name: "Sage Patel", defaultHourlyRate: 94, role: "MEMBER" },
  { email: "blake@chronomint.dev", name: "Blake Wilson", defaultHourlyRate: 108, role: "MEMBER" },
  { email: "morgan.c@chronomint.dev", name: "Morgan Chen", defaultHourlyRate: 91, role: "MEMBER" },
  { email: "avery@chronomint.dev", name: "Avery Johnson", defaultHourlyRate: 87, role: "MEMBER" },
  { email: "reese@chronomint.dev", name: "Reese Thompson", defaultHourlyRate: 99, role: "MEMBER" },
  { email: "skyler@chronomint.dev", name: "Skyler Davis", defaultHourlyRate: 103, role: "MEMBER" },
  { email: "quinn.m@chronomint.dev", name: "Quinn Morgan", defaultHourlyRate: 96, role: "MEMBER" },
  { email: "harper@chronomint.dev", name: "Harper Lewis", defaultHourlyRate: 89, role: "MEMBER" },
  { email: "emery@chronomint.dev", name: "Emery Clark", defaultHourlyRate: 101, role: "MEMBER" },
  { email: "finley@chronomint.dev", name: "Finley Scott", defaultHourlyRate: 93, role: "MEMBER" },
  { email: "rowan@chronomint.dev", name: "Rowan Adams", defaultHourlyRate: 107, role: "MEMBER" },
  { email: "inactive@chronomint.dev", name: "Lane Brooks", defaultHourlyRate: 90, role: "MEMBER" },
  { email: "newhire@chronomint.dev", name: "Dakota Reed", defaultHourlyRate: 82, role: "MEMBER" }
];

/** Members who barely log time (users_without_time report) */
export const SPARSE_LOG_EMAILS = new Set([
  "onboarding@chronomint.dev",
  "inactive@chronomint.dev",
  "newhire@chronomint.dev"
]);

const TEAM_POOL = [
  "admin@chronomint.dev",
  "ops@chronomint.dev",
  "member@chronomint.dev",
  "alex@chronomint.dev",
  "jordan@chronomint.dev",
  "taylor@chronomint.dev",
  "riley@chronomint.dev",
  "casey@chronomint.dev",
  "jamie@chronomint.dev",
  "contractor@chronomint.dev",
  "drew@chronomint.dev",
  "sage@chronomint.dev",
  "blake@chronomint.dev",
  "morgan.c@chronomint.dev",
  "avery@chronomint.dev",
  "reese@chronomint.dev",
  "skyler@chronomint.dev",
  "quinn.m@chronomint.dev",
  "harper@chronomint.dev",
  "emery@chronomint.dev",
  "finley@chronomint.dev",
  "rowan@chronomint.dev"
];

function team(offset: number, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(TEAM_POOL[(offset + i) % TEAM_POOL.length]!);
  }
  return [...new Set(out)];
}

export const CORE_PROJECTS: SeedProjectSpec[] = [
  {
    name: "Acme Website",
    color: "#6366f1",
    clientName: "Acme Corp",
    budgetHours: 520,
    budgetBurnPct: 0.78,
    tasks: [
      { name: "Frontend development", billableDefault: true },
      { name: "API integration", billableDefault: true },
      { name: "Design review", billableDefault: true },
      { name: "Sprint planning", billableDefault: true },
      { name: "Accessibility audit", billableDefault: true },
      { name: "Performance tuning", billableDefault: true }
    ],
    memberEmails: team(0, 8)
  },
  {
    name: "Beta Mobile App",
    color: "#0ea5e9",
    clientName: "Beta Inc",
    budgetHours: 680,
    budgetBurnPct: 0.55,
    tasks: [
      { name: "iOS features", billableDefault: true },
      { name: "Push notifications", billableDefault: true },
      { name: "Android parity", billableDefault: true },
      { name: "App Store submission", billableDefault: true },
      { name: "Crash analytics", billableDefault: true }
    ],
    memberEmails: team(2, 7)
  },
  {
    name: "Internal R&D",
    color: "#10b981",
    clientName: null,
    budgetHours: null,
    tasks: [
      { name: "Spike research", billableDefault: false },
      { name: "Team sync", billableDefault: false },
      { name: "Prototype", billableDefault: false },
      { name: "Tech debt", billableDefault: false },
      { name: "Architecture review", billableDefault: false }
    ],
    memberEmails: team(0, 10)
  },
  {
    name: "Gamma Rebrand",
    color: "#f59e0b",
    clientName: "Gamma LLC",
    budgetHours: 260,
    budgetBurnPct: 0.92,
    tasks: [
      { name: "Brand guidelines", billableDefault: true },
      { name: "Marketing site", billableDefault: true },
      { name: "Asset export", billableDefault: true },
      { name: "Social templates", billableDefault: true }
    ],
    memberEmails: team(4, 6)
  },
  {
    name: "Delta Support",
    color: "#a855f7",
    clientName: "Delta Co",
    budgetHours: 220,
    budgetBurnPct: 1.05,
    tasks: [
      { name: "Ticket triage", billableDefault: true },
      { name: "Hotfix", billableDefault: true },
      { name: "SLA reporting", billableDefault: true },
      { name: "Knowledge base", billableDefault: true }
    ],
    memberEmails: team(6, 6)
  },
  {
    name: "Epsilon Docs",
    color: "#ec4899",
    clientName: "Epsilon Ltd",
    budgetHours: 140,
    budgetBurnPct: 0.4,
    tasks: [
      { name: "API reference", billableDefault: true },
      { name: "Tutorial videos", billableDefault: false },
      { name: "Release notes", billableDefault: true }
    ],
    memberEmails: team(8, 5)
  },
  {
    name: "Zeta Data Pipeline",
    color: "#22c55e",
    clientName: "Zeta Analytics",
    budgetHours: 440,
    budgetBurnPct: 0.65,
    tasks: [
      { name: "ETL jobs", billableDefault: true },
      { name: "Warehouse modeling", billableDefault: true },
      { name: "Dashboard specs", billableDefault: true },
      { name: "Data QA", billableDefault: true }
    ],
    memberEmails: team(10, 7)
  },
  {
    name: "Horizon Payroll",
    color: "#eab308",
    clientName: "Horizon HR",
    budgetHours: 360,
    budgetBurnPct: 0.72,
    tasks: [
      { name: "Compliance review", billableDefault: true },
      { name: "Export mappings", billableDefault: true },
      { name: "UAT sessions", billableDefault: true }
    ],
    memberEmails: team(12, 6)
  },
  {
    name: "Iota Security Audit",
    color: "#ef4444",
    clientName: "Iota Financial",
    budgetHours: 180,
    budgetBurnPct: 0.88,
    tasks: [
      { name: "Pen test prep", billableDefault: true },
      { name: "Remediation", billableDefault: true },
      { name: "Stakeholder readout", billableDefault: true }
    ],
    memberEmails: team(14, 5)
  },
  {
    name: "Kappa Onboarding",
    color: "#06b6d4",
    clientName: "Kappa SaaS",
    budgetHours: 100,
    budgetBurnPct: 0.25,
    tasks: [
      { name: "Training materials", billableDefault: true },
      { name: "Kickoff workshops", billableDefault: true }
    ],
    memberEmails: ["alex@chronomint.dev", "onboarding@chronomint.dev", "newhire@chronomint.dev"]
  },
  {
    name: "Lambda Legacy Migration",
    color: "#64748b",
    clientName: "Lambda Industries",
    budgetHours: 720,
    budgetBurnPct: 0.48,
    tasks: [
      { name: "Discovery", billableDefault: true },
      { name: "Cutover planning", billableDefault: true },
      { name: "Regression suite", billableDefault: true },
      { name: "Runbook", billableDefault: true },
      { name: "Hypercare", billableDefault: true }
    ],
    memberEmails: team(1, 9)
  },
  {
    name: "Mu Partner Portal",
    color: "#8b5cf6",
    clientName: "Mu Networks",
    budgetHours: 320,
    budgetBurnPct: 0.61,
    tasks: [
      { name: "Partner API", billableDefault: true },
      { name: "Billing hooks", billableDefault: true },
      { name: "Partner docs", billableDefault: false }
    ],
    memberEmails: team(16, 6)
  }
];

export const EXTRA_PROJECTS: SeedProjectSpec[] = [
  {
    name: "Nu Commerce Platform",
    color: "#0d9488",
    clientName: "Nu Retail",
    budgetHours: 400,
    budgetBurnPct: 0.7,
    tasks: [
      { name: "Checkout flow", billableDefault: true },
      { name: "Inventory sync", billableDefault: true },
      { name: "Promo engine", billableDefault: true },
      { name: "Load testing", billableDefault: true }
    ],
    memberEmails: team(3, 7)
  },
  {
    name: "Xi CRM Integration",
    color: "#7c3aed",
    clientName: "Xi Systems",
    budgetHours: 280,
    budgetBurnPct: 0.83,
    tasks: [
      { name: "Salesforce sync", billableDefault: true },
      { name: "Field mapping", billableDefault: true },
      { name: "Webhook handlers", billableDefault: true }
    ],
    memberEmails: team(5, 6)
  },
  {
    name: "Omicron Observability",
    color: "#db2777",
    clientName: "Omicron Cloud",
    budgetHours: 200,
    budgetBurnPct: 0.58,
    tasks: [
      { name: "Metrics pipeline", billableDefault: true },
      { name: "Alerting rules", billableDefault: true },
      { name: "Dashboards", billableDefault: true }
    ],
    memberEmails: team(7, 7)
  },
  {
    name: "Pi Design System",
    color: "#ca8a04",
    clientName: "Pi Studio",
    budgetHours: 160,
    budgetBurnPct: 0.95,
    tasks: [
      { name: "Component library", billableDefault: true },
      { name: "Figma tokens", billableDefault: true },
      { name: "Storybook", billableDefault: true }
    ],
    memberEmails: team(9, 5)
  },
  {
    name: "Rho Infrastructure",
    color: "#475569",
    clientName: "Rho Hosting",
    budgetHours: 500,
    budgetBurnPct: 0.52,
    tasks: [
      { name: "K8s migration", billableDefault: true },
      { name: "CI/CD pipelines", billableDefault: true },
      { name: "Cost optimization", billableDefault: true },
      { name: "DR drill", billableDefault: true }
    ],
    memberEmails: team(11, 8)
  },
  {
    name: "Sigma AI Assistant",
    color: "#2563eb",
    clientName: "Sigma Labs",
    budgetHours: 350,
    budgetBurnPct: 0.67,
    tasks: [
      { name: "Prompt tuning", billableDefault: true },
      { name: "RAG pipeline", billableDefault: true },
      { name: "Safety review", billableDefault: true }
    ],
    memberEmails: team(13, 6)
  },
  {
    name: "Tau Field Service",
    color: "#16a34a",
    clientName: "Tau Logistics",
    budgetHours: 300,
    budgetBurnPct: 0.74,
    tasks: [
      { name: "Mobile offline", billableDefault: true },
      { name: "Route optimization", billableDefault: true },
      { name: "Technician portal", billableDefault: true }
    ],
    memberEmails: team(15, 7)
  },
  {
    name: "Upsilon Legal Hold",
    color: "#78716c",
    clientName: "Upsilon Legal",
    budgetHours: 120,
    budgetBurnPct: 0.41,
    tasks: [
      { name: "eDiscovery export", billableDefault: true },
      { name: "Chain of custody", billableDefault: true }
    ],
    memberEmails: team(17, 4)
  },
  {
    name: "Phi Healthcare Portal",
    color: "#0891b2",
    clientName: "Phi Health",
    budgetHours: 420,
    budgetBurnPct: 0.69,
    tasks: [
      { name: "HIPAA review", billableDefault: true },
      { name: "Patient scheduling", billableDefault: true },
      { name: "HL7 integration", billableDefault: true },
      { name: "Audit logging", billableDefault: true }
    ],
    memberEmails: team(19, 8)
  },
  {
    name: "Chi Event Platform",
    color: "#c026d3",
    clientName: "Chi Events",
    budgetHours: 240,
    budgetBurnPct: 0.8,
    tasks: [
      { name: "Ticketing API", billableDefault: true },
      { name: "Check-in app", billableDefault: true },
      { name: "Sponsor portal", billableDefault: true }
    ],
    memberEmails: team(2, 7)
  },
  {
    name: "Psi Media Streaming",
    color: "#dc2626",
    clientName: "Psi Media",
    budgetHours: 380,
    budgetBurnPct: 0.56,
    tasks: [
      { name: "CDN rollout", billableDefault: true },
      { name: "DRM integration", billableDefault: true },
      { name: "Analytics beacon", billableDefault: true }
    ],
    memberEmails: team(4, 7)
  },
  {
    name: "Omega Gov Contract",
    color: "#1e3a8a",
    clientName: "Omega Public Sector",
    budgetHours: 600,
    budgetBurnPct: 0.45,
    tasks: [
      { name: "Security clearance docs", billableDefault: true },
      { name: "Section 508", billableDefault: true },
      { name: "FedRAMP gap analysis", billableDefault: true },
      { name: "Quarterly reporting", billableDefault: true }
    ],
    memberEmails: team(0, 9)
  },
  {
    name: "Atlas Training LMS",
    color: "#65a30d",
    clientName: "Atlas Learning",
    budgetHours: 180,
    budgetBurnPct: 0.63,
    tasks: [
      { name: "Course authoring", billableDefault: true },
      { name: "SCORM packaging", billableDefault: true },
      { name: "Certification flows", billableDefault: false }
    ],
    memberEmails: team(6, 6)
  },
  {
    name: "Nova Subscription Billing",
    color: "#e11d48",
    clientName: "Nova SaaS",
    budgetHours: 290,
    budgetBurnPct: 1.02,
    tasks: [
      { name: "Stripe migration", billableDefault: true },
      { name: "Proration logic", billableDefault: true },
      { name: "Revenue recognition", billableDefault: true }
    ],
    memberEmails: team(8, 7)
  }
];

export const ALL_USERS = [...CORE_USERS, ...EXTRA_USERS];
export const ALL_PROJECTS = [...CORE_PROJECTS, ...EXTRA_PROJECTS];
