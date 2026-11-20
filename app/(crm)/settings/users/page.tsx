import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser, type Profile } from "@/lib/supabase/server";
import { PICKLISTS } from "@/lib/picklists";
import { formatDate } from "@/lib/format";
import { updateUser } from "@/app/(crm)/actions";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const { supabase, user, profile } = await requireUser();
  if (profile?.role !== "admin") redirect("/");
  const { data } = await supabase.from("profiles").select("id,email,full_name,title,role,is_active,created_at").order("full_name");
  const users = (data ?? []) as (Profile & { created_at: string })[];

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-muted">New people join by signing up. Assign their role here.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Email</th>
              <th className="th">Title</th>
              <th className="th">Joined</th>
              <th className="th">Role &amp; status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="td font-semibold">{u.full_name ?? "—"}{u.id === user.id && <span className="ml-1 font-normal text-muted">(you)</span>}</td>
                <td className="td">{u.email}</td>
                <td className="td">{u.title ?? ""}</td>
                <td className="td">{formatDate(u.created_at)}</td>
                <td className="td">
                  <form action={updateUser.bind(null, u.id)} className="flex items-center gap-2">
                    <select name="role" defaultValue={u.role} className="input h-7 w-48" disabled={u.id === user.id}>
                      {PICKLISTS.user_role.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" name="is_active" defaultChecked={u.is_active} disabled={u.id === user.id} className="accent-[#0176d3]" /> Active
                    </label>
                    {u.id !== user.id && <button type="submit" className="btn h-7 px-3">Save</button>}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
