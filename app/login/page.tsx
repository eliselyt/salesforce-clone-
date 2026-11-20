import type { Metadata } from "next";
import { LogoMark } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log In" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <main className="app-backdrop flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <LogoMark size={56} />
          <h1 className="text-2xl font-semibold text-ink">Meridian CRM</h1>
          <p className="text-muted">Sales, service and marketing in one place.</p>
        </div>
        <LoginForm next={sp.next ?? "/"} initialError={sp.error} />
      </div>
    </main>
  );
}
