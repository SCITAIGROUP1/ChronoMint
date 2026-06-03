"use client";

import { ROUTES } from "@chronomint/contracts";
import type { HourlyRateDto } from "@chronomint/contracts";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@chronomint/ui";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function BillingPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [rates, setRates] = useState<HourlyRateDto[]>([]);
  const [rate, setRate] = useState("100");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    api<HourlyRateDto[]>(ROUTES.BILLING.RATES, { workspaceId: ws }).then(setRates);
  }, [ws]);

  async function addRate(e: React.FormEvent) {
    e.preventDefault();
    await api(ROUTES.BILLING.RATES, {
      method: "POST",
      workspaceId: ws,
      body: JSON.stringify({
        rate: parseFloat(rate),
        ...(userId ? { userId } : {})
      })
    });
    setRates(await api<HourlyRateDto[]>(ROUTES.BILLING.RATES, { workspaceId: ws }));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Billing</h2>
      <Card>
        <CardHeader>
          <CardTitle>Add hourly rate</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addRate} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Rate</Label>
              <Input
                id="rate"
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId">User ID (optional)</Label>
              <Input id="userId" value={userId} onChange={(e) => setUserId(e.target.value)} />
            </div>
            <Button type="submit">Save rate</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Rates</CardTitle>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rates configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate ($/hr)</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Effective</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.rate}</TableCell>
                    <TableCell>{r.userId ?? "Workspace default"}</TableCell>
                    <TableCell>{new Date(r.effectiveFrom).toLocaleDateString()}</TableCell>
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
