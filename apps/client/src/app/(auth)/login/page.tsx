"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label
} from "@chronomint/ui";
import { ROUTES } from "@chronomint/contracts";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";
import type { AuthSessionDto } from "@chronomint/contracts";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useSessionStore((s) => s.setSession);
  const next = searchParams.get("next");
  const [email, setEmail] = useState("member@chronomint.dev");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api<AuthSessionDto & { accessToken: string }>(ROUTES.AUTH.LOGIN, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setSession(res, res.accessToken);
      router.push(next && next.startsWith("/") ? next : "/timer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to ChronoMint</CardTitle>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit">Sign in</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <a href="/register" className="text-primary hover:underline">
              Create account
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
