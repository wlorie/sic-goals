"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Roster = {
  pair_id: string;
  school_name: string;
  educator_email: string;
  educator_name: string;
  evaluator_email: string;
  evaluator_name: string;
  resolution_email: string;
  resolution_name: string;
};

type PartName = "Part1" | "Part2" | "Part3" | "Part4";

type Parts = {
  pair_id: string;
  part_name: PartName;

  // ---- Part 1 (goals) fields ----
  goal_statement1?: string;
  why_goal1?: string;
  measure1?: string;
  why_measure1?: string;
  monitoring_plan1?: string;
  success_criteria1?: string;
  timeline1?: string;

  goal_statement2?: string;
  why_goal2?: string;
  measure2?: string;
  why_measure2?: string;
  monitoring_plan2?: string;
  success_criteria2?: string;
  timeline2?: string;

  goal_statement3?: string;
  why_goal3?: string;
  measure3?: string;
  why_measure3?: string;
  monitoring_plan3?: string;
  success_criteria3?: string;
  timeline3?: string;

  // ---- Example fields for other parts (scaffold) ----
  conversation_summary?: string; // Part2
  key_evidence?: string;         // Part2

  resolution_decision?: string;  // Part3
  resolution_rationale?: string; // Part3

  outcome_summary?: string;      // Part4
  goal_evidence?: string;        // Part4
};

export default function AppPage() {
  const [email, setEmail] = useState("");
  const [pairs, setPairs] = useState<Roster[]>([]);
  const [pairId, setPairId] = useState("");
  const [part, setPart] = useState<PartName>("Part1");
  const [data, setData] = useState<Parts | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Load user (email used for UI gating only; RLS is enforced server-side)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email?.toLowerCase() ?? ""));
  }, []);

  // Load roster (RLS will restrict to this user’s pairs)
  useEffect(() => {
    if (!email) return;
    (async () => {
      const { data, error } = await supabase.from("roster").select("*");
      if (error) {
        console.warn(error);
        setStatus(error.message);
        return;
      }
      const rows = data || [];
      setPairs(rows);
      if (rows.length && !pairId) setPairId(rows[0].pair_id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  // Load current part data
  useEffect(() => {
    if (!pairId) return;
    setStatus(null);
    (async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("*")
        .eq("pair_id", pairId)
        .eq("part_name", part)
        .single();
      if (error && (error as any).code !== "PGRST116") {
        console.warn(error);
        setStatus(error.message);
      }
      setData(data || null);
    })();
  }, [pairId, part]);

  // Role-based gating in the main page; passed to child components
  const canEdit = useMemo(() => {
    const r = pairs.find((p) => p.pair_id === pairId);
    if (!r || !email) return false;
    const em = email.toLowerCase();
    if (part === "Part1") return r.educator_email?.toLowerCase() === em;
    if (part === "Part3") return r.resolution_email?.toLowerCase() === em;
    if (part === "Part2" || part === "Part4") return r.evaluator_email?.toLowerCase() === em;
    return false;
  }, [pairs, pairId, part, email]);

  async function save(fields?: Partial<Parts>) {
    setSaving(true);
    setStatus(null);
    const row: Parts = { pair_id: pairId, part_name: part, ...(data || {}), ...(fields || {}) };

    const { error } = await supabase
      .from("parts")
      .upsert(row, { onConflict: "pair_id,part_name" });

    setSaving(false);

    if (error) {
      setStatus(error.message);
      alert(error.message);
      return;
    }

    // Re-fetch to show the canonical (DB) state
    const res = await supabase
      .from("parts")
      .select("*")
      .eq("pair_id", pairId)
      .eq("part_name", part)
      .single();

    if (!res.error) {
      setData(res.data);
      setStatus("Saved");
      setTimeout(() => setStatus(null), 2000);
    } else {
      setStatus(res.error.message);
    }
  }

  if (!email)
    return (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        Checking session… <a href="/login">Login</a>
      </div>
    );

  return (
    <main style={{ maxWidth: 1000, margin: "20px auto", fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div><b>Pilot Data Entry</b></div>
        <div>{email}</div>
      </header>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <label>Pair</label>
        <select value={pairId} onChange={(e) => setPairId(e.target.value)}>
          {pairs.map((p) => (
            <option key={p.pair_id} value={p.pair_id}>
              {(p.educator_name || "Educator")} (Educator) —{" "}
              {(p.evaluator_name || "Evaluator")} (Evaluator) —{" "}
              {(p.resolution_name || "Resolution")} (Resolution)
            </option>
          ))}
        </select>

        <nav style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {(["Part1", "Part2", "Part3", "Part4"] as const).map((name) => (
            <button
              key={name}
              onClick={() => setPart(name)}
              style={{
                padding: "6px 10px",
                background: part === name ? "#111" : "#fff",
                color: part === name ? "#fff" : "#111",
                border: "1px solid #ddd",
                borderRadius: 6,
              }}
            >
              {name.replace("Part", "Part ")}
            </button>
          ))}
        </nav>
      </div>

      {status && (
        <div style={{ marginBottom: 8, fontSize: 14, color: status === "Saved" ? "green" : "crimson" }}>
          {status}
        </div>
      )}

      {/* Part I (Goals) */}
      {part === "Part1" && (
        <Part1
          value={data || { pair_id: pairId, part_name: "Part1" }}
          onChange={(fields) =>
            setData((prev) => ({ ...(prev || { pair_id: pairId, part_name: "Part1" }), ...fields }))
          }
          onSave={() => save()}
          disabled={!canEdit || saving}
        />
      )}

      {/* Part II – Part IV use a generic scaffold so you can iterate quickly */}
      {part === "Part2" && (
        <PartSection
          key="p2"
          pairId={pairId}
          part="Part2"
          record={data}
          setRecord={setData}
          onSave={() => save()}
          canEdit={canEdit}
          saving={saving}
          fields={[
            { key: "conversation_summary", label: "Conversation Summary", type: "textarea" },
            { key: "key_evidence", label: "Key Evidence Discussed", type: "textarea" },
          ]}
        />
      )}

      {part === "Part3" && (
        <PartSection
          key="p3"
          pairId={pairId}
          part="Part3"
          record={data}
          setRecord={setData}
          onSave={() => save()}
          canEdit={canEdit}
          saving={saving}
          fields={[
            { key: "resolution_decision", label: "Resolution Decision", type: "textarea" },
            { key: "resolution_rationale", label: "Rationale", type: "textarea" },
          ]}
        />
      )}

      {part === "Part4" && (
        <PartSection
          key="p4"
          pairId={pairId}
          part="Part4"
          record={data}
          setRecord={setData}
          onSave={() => save()}
          canEdit={canEdit}
          saving={saving}
          fields={[
            { key: "outcome_summary", label: "End-of-Year Outcome Summary", type: "textarea" },
            { key: "goal_evidence", label: "Evidence of Goal Attainment", type: "textarea" },
          ]}
        />
      )}
    </main>
  );
}

/* =========================
   UI helpers
========================= */
function Box({ title, children }: { title: string; children: any }) {
  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 10, padding: 12, margin: "10px 0" }}>
      <div
        style={{
          fontWeight: 700,
          background: "#f3f8ef",
          margin: -12,
          marginBottom: 8,
          padding: "8px 12px",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
function TArea(props: any) {
  return <textarea {...props} style={{ width: "100%", minHeight: 90, padding: 8 }} />;
}
function TInput(props: any) {
  return <input {...props} style={{ width: "100%", padding: 8 }} />;
}

/* =========================
   Part I (Goals)
========================= */
function Part1({
  value,
  onChange,
  onSave,
  disabled,
}: {
  value: any;
  onChange: (f: any) => void;
  onSave: () => void;
  disabled: boolean;
}) {
  const G = (n: number, prefix: string) => `${prefix}${n}`;
  const block = (n: number) => (
    <Box key={n} title={`Goal ${n}`}>
      <label>Goal statement</label>
      <TArea
        disabled={disabled}
        value={value[G(n, "goal_statement")] || ""}
        onChange={(e) => onChange({ [G(n, "goal_statement")]: e.target.value })}
      />
      <label>I chose this goal because</label>
      <TArea
        disabled={disabled}
        value={value[G(n, "why_goal")] || ""}
        onChange={(e) => onChange({ [G(n, "why_goal")]: e.target.value })}
      />
      <label>Measure/Assessment</label>
      <TInput
        disabled={disabled}
        value={value[G(n, "measure")] || ""}
        onChange={(e) => onChange({ [G(n, "measure")]: e.target.value })}
      />
      <label>I chose this Measure/Assessment because</label>
      <TArea
        disabled={disabled}
        value={value[G(n, "why_measure")] || ""}
        onChange={(e) => onChange({ [G(n, "why_measure")]: e.target.value })}
      />
      <label>My plan for monitoring progress</label>
      <TArea
        disabled={disabled}
        value={value[G(n, "monitoring_plan")] || ""}
        onChange={(e) => onChange({ [G(n, "monitoring_plan")]: e.target.value })}
      />
      <label>Success criteria</label>
      <TArea
        disabled={disabled}
        value={value[G(n, "success_criteria")] || ""}
        onChange={(e) => onChange({ [G(n, "success_criteria")]: e.target.value })}
      />
      <label>By when (Timeline)</label>
      <TInput
        disabled={disabled}
        value={value[G(n, "timeline")] || ""}
        onChange={(e) => onChange({ [G(n, "timeline")]: e.target.value })}
      />
    </Box>
  );

  return (
    <div>
      {[1, 2, 3].map(block)}
      <button
        disabled={disabled}
        onClick={onSave}
        style={{
          padding: "8px 12px",
          border: "1px solid #333",
          background: disabled ? "#888" : "#111",
          color: "#fff",
          borderRadius: 8,
        }}
      >
        Save
      </button>
      {disabled && <p style={{ color: "#666" }}>You have view-only access to this section.</p>}
    </div>
  );
}

/* =========================
   Generic Part Section (II–IV)
========================= */
function PartSection({
  pairId,
  part,
  record,
  setRecord,
  onSave,
  canEdit,
  saving,
  fields,
}: {
  pairId: string;
  part: PartName;
  record: Parts | null;
  setRecord: (r: Parts | null) => void;
  onSave: () => void;
  canEdit: boolean;
  saving: boolean;
  fields: { key: keyof Parts; label: string; type: "textarea" | "text" }[];
}) {
  const disabled = !canEdit || saving;

  const setField = (k: keyof Parts) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setRecord({
      ...(record || { pair_id: pairId, part_name: part }),
      [k]: e.target.value,
    } as Parts);

  return (
    <div>
      {!canEdit && (
        <div style={{ padding: 8, margin: "8px 0", border: "1px solid #eee", borderRadius: 8 }}>
          Read-only view
        </div>
      )}

      {fields.map((f) => (
        <Box key={String(f.key)} title={f.label}>
          {f.type === "textarea" ? (
            <TArea
              disabled={disabled}
              value={(record as any)?.[f.key] || ""}
              onChange={setField(f.key)}
            />
          ) : (
            <TInput
              disabled={disabled}
              value={(record as any)?.[f.key] || ""}
              onChange={setField(f.key)}
            />
          )}
        </Box>
      ))}

      <button
        disabled={disabled}
        onClick={onSave}
        style={{
          padding: "8px 12px",
          border: "1px solid #333",
          background: disabled ? "#888" : "#111",
          color: "#fff",
          borderRadius: 8,
        }}
      >
        Save
      </button>
      {disabled && <p style={{ color: "#666" }}>You have view-only access to this section.</p>}
    </div>
  );
}

