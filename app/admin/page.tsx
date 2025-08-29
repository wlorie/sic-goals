"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Row = Record<string, unknown>;

function toCSV(rows: Row[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.join(",");
  const body = rows.map(r => cols.map(c => esc(r[c])).join(",")).join("\n");
  return [header, body].join("\n");
}

export default function AdminPage() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      setChecking(true);
      setError(null);
      const { data: userRes, error: uerr } = await supabase.auth.getUser();
      if (uerr || !userRes?.user) {
        setError("You are not signed in.");
        setChecking(false);
        return;
      }
      const { data: ok, error: aerr } = await supabase.rpc("is_admin");
      if (aerr) setError(aerr.message);
      setIsAdmin(!!ok);
      setChecking(false);
    })();
  }, [supabase]);

  async function downloadCSV() {
    setError(null);
    setDownloading(true);
    const { data, error } = await supabase.rpc("admin_export");
    setDownloading(false);
    if (error) {
      setError(error.message);
      return;
    }
    const rows = (data ?? []) as Row[];
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parts_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ padding: 20, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Admin</h1>

      {checking && <p>Checking admin access…</p>}

      {!checking && !isAdmin && (
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #f5c6cb",
            background: "#f8d7da",
            color: "#721c24",
            marginTop: 10,
          }}
        >
          {error ?? "You do not have admin access."}
        </div>
      )}

      {!checking && isAdmin && (
        <>
          <p style={{ marginBottom: 16 }}>
            Read-only export of all records. Click the button below to download CSV.
          </p>
          <button
            onClick={downloadCSV}
            disabled={downloading}
            style={{
              display: "inline-block",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #111",
              background: downloading ? "#888" : "#111",
              color: "#fff",
              fontWeight: 600,
              cursor: downloading ? "not-allowed" : "pointer",
            }}
          >
            {downloading ? "Preparing…" : "Download CSV"}
          </button>
          {error && (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #f5c6cb",
                background: "#f8d7da",
                color: "#721c24",
                marginTop: 10,
              }}
            >
              {error}
            </div>
          )}
        </>
      )}
    </main>
  );
}
