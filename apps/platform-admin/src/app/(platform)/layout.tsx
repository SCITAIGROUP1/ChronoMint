import { Suspense } from "react";
import { PlatformShell } from "@/components/platform-shell";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PlatformShell>{children}</PlatformShell>
    </Suspense>
  );
}
