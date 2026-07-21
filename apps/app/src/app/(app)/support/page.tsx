"use client";

import {
  AppBar,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DashboardStatCard,
  type DashboardStatTone
} from "@kloqra/ui";
import { SupportTicketForm, getApiBase } from "@kloqra/web-shared";
import { Clock, CreditCard, MessageSquare, ShieldCheck, type LucideIcon } from "lucide-react";
import { useSessionStore } from "@/stores/session.store";

const SLA_SUMMARY: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone: DashboardStatTone;
}[] = [
  {
    icon: ShieldCheck,
    label: "Security",
    value: "15 min",
    hint: "Priority response",
    tone: "warning"
  },
  {
    icon: Clock,
    label: "Bug Reports",
    value: "1 hour",
    hint: "Technical support",
    tone: "primary"
  },
  {
    icon: CreditCard,
    label: "Billing",
    value: "2 hours",
    hint: "Payments and invoices",
    tone: "premium"
  },
  {
    icon: Clock,
    label: "Plans",
    value: "4 hours",
    hint: "Subscription support",
    tone: "success"
  },
  {
    icon: MessageSquare,
    label: "General",
    value: "8 hours",
    hint: "General inquiries",
    tone: "primary"
  }
];

export default function TenantSupportPage() {
  const session = useSessionStore((s) => s.session);

  return (
    <div className="space-y-6">
      <AppBar
        title="Contact Support"
        description="Our team will respond based on the type and urgency of your request."
      />

      {/* SLA at-a-glance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {SLA_SUMMARY.map((s) => (
          <Card key={s.label} className="min-w-0">
            <CardContent className="h-full p-4">
              <DashboardStatCard
                label={s.label}
                value={s.value}
                hint={s.hint}
                icon={s.icon}
                tone={s.tone}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main form */}
      <section className="w-full" role="region" aria-label="Support request form">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>New Support Request</CardTitle>
            <CardDescription>
              {session
                ? `Submitting as ${session.user.name}${session.user.email ? ` (${session.user.email})` : ""}`
                : "Fill in your details below"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SupportTicketForm
              apiBase={getApiBase()}
              requesterEmail={session?.user.email ?? ""}
              requesterName={session?.user.name ?? ""}
              tenantId={session?.tenantId ?? undefined}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
