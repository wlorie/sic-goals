// app/admin/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export default async function AdminPage() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );

  // Require login
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Require admin
  const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin");
  if (adminErr || !isAdmin) redirect("/app");

  // (Optional) You can fetch summary stats here if you want.
  return (
    <main style={{ padding: 20, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Admin</h1>
      <p style={{ marginBottom: 16 }}>
        Read-only access to all records. Use the button below to download a CSV export.
      </p>
      <a
        href="/api/export"
        style={{
          display: "inline-block",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #111",
          background: "#111",
          color: "#fff",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Download CSV
      </a>
    </main>
  );
}
