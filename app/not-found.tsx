import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="app-backdrop flex min-h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <LogoMark size={48} />
      <h1 className="text-xl font-semibold">We couldn’t find that page</h1>
      <p className="text-muted">The record may have been deleted, or you may not have access to it.</p>
      <Link href="/" className="btn-brand">
        Go Home
      </Link>
    </main>
  );
}
