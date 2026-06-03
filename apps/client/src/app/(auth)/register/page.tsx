"use client";

import { ROUTES } from "@chronomint/contracts";
import type { AuthSessionDto } from "@chronomint/contracts";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@chronomint/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api<AuthSessionDto & { accessToken: string }>(ROUTES.AUTH.REGISTER, {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });
      setSession(res, res.accessToken);
      router.push("/timer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit">Register</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
