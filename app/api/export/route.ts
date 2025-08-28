// app/api/export/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/ssr";

export async function GET() {
  const supabase = createRouteHandlerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );

  // Require login
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Require admin
  const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin");
  if (adminErr || !isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Pull from the view if you created `parts_export`.
  // If you haven't created it yet, let me know and I’ll paste that SQL again.
  const { data, error } = await supabase.from("parts_export").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cols = data.length ? Object.keys(data[0]) : [];
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
  const csv = [cols.join(","), ...data.map(row => cols.map(c => esc((row as any)[c])).join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="parts_export.csv"',
    },
  });
}
