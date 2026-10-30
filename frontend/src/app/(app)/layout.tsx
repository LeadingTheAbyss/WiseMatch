"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { Spinner } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!me) router.replace("/");
    else if (!me.onboarded) router.replace("/start");
  }, [loading, me, router]);

  if (loading || !me || !me.onboarded) {
    return (
      <div className="grid min-h-dvh place-items-center text-muted">
        <Spinner size={28} />
      </div>
    );
  }
  return <Shell>{children}</Shell>;
}
