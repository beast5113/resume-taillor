import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE, readEnv } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import type { Role } from "@/lib/access";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? "";
  const secret = readEnv(process.env.SESSION_SECRET);

  const session = token ? await verifySession(token, secret) : null;
  let userName = "";
  let liveRole = "assistant";
  if (session?.userId) {
    const { data } = await supabase
      .from("team_users")
      .select("name, role")
      .eq("id", session.userId)
      .maybeSingle();
    userName = data?.name ?? "";
    liveRole = data?.role ?? "assistant";
  }
  const role: Role =
    liveRole === "super_admin" ? "super_admin" : liveRole === "admin" ? "admin" : "assistant";

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar role={role} userName={userName} />
      <main className="app-canvas flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
