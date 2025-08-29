"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; // ⬅ use the shared client

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
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return [header, body].join("\n");
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      setChecking(true);
      setError(null);

      // 1) Get current session (more reliable right after navigation)
      const { data: sessRes, error: sErr } = await supabase.auth.getSession();
      if (sErr || !sessRes?.session?.user) {
        if (mounted) setChecking(false);
        return;
      }

      // 2) Confirm admin via RPC
      const { data: ok, error: aErr } = await supabase.rpc("is_admin");
      if (mounted) {
        if (aErr) setError(aErr.message);
        setIsAdmin(!!ok);
        setChecking(false);
      }
    }

    check();

    // 3) Listen for auth changes (restores after OTP flow / page nav)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      if (session?.user) {
        (async () => {
          const { data: ok } = await supabase.rpc("is_admin");
          setIsAdmin(!!ok);
          setChecking(false);
        })();
      } else {
        setIsAdmin(false);
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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

  async function downloadRosterCSV() {
    setError(null);
    setDownloading(true);
    const { data, error } = await supabase.rpc("admin_export_roster");
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
    a.download = "roster_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ padding: 20, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      {/* Header with Logout */}
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div><b>Admin</b></div>
        <div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            style={{
              padding: "6px 10px",
              border: "1px solid #333",
              background: "#111",
              color: "#fff",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </div>
      </header>

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
          You are not signed in or do not have admin access.
        </div>
      )}

      {!checking && isAdmin && (
        <>
          <p style={{ marginBottom: 16 }}>
            Read-only exports of all records. Click a button below to download CSV.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
              {downloading ? "Preparing…" : "Download Parts CSV"}
            </button>

            <button
              onClick={downloadRosterCSV}
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
              {downloading ? "Preparing…" : "Download Roster CSV"}
            </button>
          </div>

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
