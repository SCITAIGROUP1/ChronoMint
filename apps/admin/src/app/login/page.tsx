"use client";

import { ROUTES } from "@chronomint/contracts";
import type { AuthSessionDto } from "@chronomint/contracts";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@chronomint/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const [email, setEmail] = useState("admin@chronomint.dev");
  const [password, setPassword] = useState("password123");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await api<AuthSessionDto & { accessToken: string }>(ROUTES.AUTH.LOGIN, {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (res.workspaceRole !== "ADMIN") {
      alert("Admin access required");
      return;
    }
    setSession(res, res.accessToken);
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
