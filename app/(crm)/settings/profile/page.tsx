import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { picklistLabel } from "@/lib/picklists";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("full_name,title,phone,role").eq("id", user.id).single();

  return (
    <div className="card mx-auto max-w-2xl overflow-hidden">
      <div className="border-b border-line px-6 py-4">
        <h1 className="text-xl font-semibold">My Profile</h1>
        <p className="text-muted">
          {user.email} · {picklistLabel("user_role", data?.role)}
        </p>
      </div>
      <ProfileForm fullName={data?.full_name ?? ""} title={data?.title ?? ""} phone={data?.phone ?? ""} />
    </div>
  );
}
