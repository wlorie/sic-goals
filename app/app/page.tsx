"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";

type Roster = {
  pair_id: string;
  school_name: string | null;
  educator_email: string | null;
  educator_name: string | null;
  evaluator_email: string | null;
  evaluator_name: string | null;
  resolution_email: string | null;
  resolution_name: string | null;
};

type PartName = "Part1" | "Part2" | "Part3" | "Part4";

export type Parts = {
  pair_id: string;
  part_name: PartName;

  // Part I
  goal_statement1?: string | null;
  why_goal1?: string | null;
  measure1?: string | null;
  why_measure1?: string | null;
  monitoring_plan1?: string | null;
  success_criteria1?: string | null;
  timeline1?: string | null;

  goal_statement2?: string | null;
  why_goal2?: string | null;
  measure2?: string | null;
  why_measure2?: string | null;
  monitoring_plan2?: string | null;
  success_criteria2?: string | null;
  timeline2?: string | null;

  goal_statement3?: string | null;
  why_goal3?: string | null;
  measure3?: string | null;
  why_measure3?: string | null;
  monitoring_plan3?: string | null;
  success_criteria3?: string | null;
  timeline3?: string | null;

  // Part II (scaffold)
  conversation_summary?: string | null;
  key_evidence?: string | null;

  // Part III (scaffold)
  resolution_decision?: string | null;
  resolution_rationale?: string | null;

  // Part IV (scaffold)
  outcome_summary?: string | null;
  goal_evidence?: string | null;
};

export default function AppPage() {
  const [email, setEmail] = useState<string>("");
  const [pairs, setPairs] = useState<Roster[]>([]);
  const [pairId, setPairId] = useState<string>("");
  const [part, setPart] = useState<PartName>("Part1");
  const [data, setData] = useState<Parts | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);

  // Load user email
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const e = data.user?.email ?? "";
      setEmail(e.toLowerCase());
    });
  }, []);

  // Load roster (RLS will restrict)
  useEffect(() => {
    if (!email) return;
    (async () => {
      const { data, error } = await supabase.from("roster").select("*");
      if (error) {
        console.warn(error);
        setStatus(error.message);
        return;
      }
      const rows = (data ?? []) as Roster[];
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
        .maybeSingle(); // avoids throwing on 0 rows

      if (error) {
        console.warn(error);
        setStatus(error.message);
      }
      setData((data as Parts) ?? null);
    })();
  }, [pairId, part]);

  // Role-based gating
  const canEdit = useMemo<boolean>(() => {
    const r = pairs.find((p) => p.pair_id === pairId);
    if (!r || !email) return false;
    const em = email.toLowerCase();
    if (part === "Part1") return (r.educator_email ?? "").toLowerCase() === em;
    if (part === "Part3") return (r.resolution_email ?? "").toLowerCase() === em;
    if (part === "Part2" || part === "Part4") return (r.evaluator_email ?? "").toLowerCase() === em;
    return false;
  }, [pairs, pairId, part, email]);

  async function save(fields?: Partial<Parts>) {
    setSaving(true);
    setStatus(null);

    const base: Parts = data ?? { pair_id: pairId, part_name: part };
    const row: Parts = { ...base, ...(fields ?? {}) };

    const { error } = await supabase
      .from("parts")
      .upsert(row, { onConflict: "pair_id,part_name" });

    setSaving(false);

    if (error) {
      setStatus(error.message);
      alert(error.message);
      return;
    }

    const res = await supabase
      .from("parts")
      .select("*")
      .eq("pair_id", pairId)
      .eq("part_name", part)
      .maybeSingle();

    if (!res.error) {
      setData((res.data as Parts) ?? null);
      setStatus("Saved");
      setTimeout(() => setStatus(null), 2000);
    } else {
      setStatus(res.error.message);
    }
  }

  // ---- Fix: always pass a literal "Part1" to <Part1> ----
  type Part1Value = Partial<Parts> & { pair_id: string; part_name: "Part1" };
  const part1Value: Part1Value = {
    pair_id: pairId,
    part_name: "Part1",
    ...(data?.part_name === "Part1" ? data : {}),
  };

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

      {/* Part I */}
      {part === "Part1" && (
        <Part1
          value={part1Value}
          onChange={(fields) =>
            setData((prev) => {
              const base: Part1Value =
                prev?.part_name === "Part1"
                  ? (prev as Part1Value)
                  : { pair_id: pairId, part_name: "Part1" };
              return { ...base, ...fields };
            })
          }
          onSave={() => save()}
          disabled={!canEdit || saving}
        />
      )}

      {/* Part II–IV */}
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
function Box({ title, children }: { title: string; children: ReactNode }) {
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

type TAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
function TArea(props: TAreaProps) {
  return <textarea {...props} style={{ width: "100%", minHeight: 90, padding: 8 }} />;
}

type TInputProps = React.InputHTMLAttributes<HTMLInputElement>;
function TInput(props: TInputProps) {
  return <input {...props} style={{ width: "100%", padding: 8 }} />;
}

/* =========================
   Part I (Goals)
========================= */
type Part1Value = Partial<Parts> & { pair_id: string; part_name: "Part1" };

function Part1({
  value,
  onChange,
  onSave,
  disabled,
}: {
  value: Part1Value;
  onChange: (f: Partial<Parts>) => void;
  onSave: () => void;
  disabled: boolean;
}) {
  const G = (n: number, prefix: string) => `${prefix}${n}` as const;

  const handleText =
    (key: keyof Parts) =>
    (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      onChange({ [key]: e.target.value } as Partial<Parts>);

  const block = (n: number) => (
    <Box key={n} title={`Goal ${n}`}>
      <label>Goal statement</label>
      <TArea
        disabled={disabled}
        value={(value[G(n, "goal_statement") as keyof Parts] as string) ?? ""}
        onChange={handleText(G(n, "goal_statement") as keyof Parts)}
      />
      <label>I chose this goal because</label>
      <TArea
        disabled={disabled}
        value={(value[G(n, "why_goal") as keyof Parts] as string) ?? ""}
        onChange={handleText(G(n, "why_goal") as keyof Parts)}
      />
      <label>Measure/Assessment</label>
      <TInput
        disabled={disabled}
        value={(value[G(n, "measure") as keyof Parts] as string) ?? ""}
        onChange={handleText(G(n, "measure") as keyof Parts)}
      />
      <label>I chose this Measure/Assessment because</label>
      <TArea
        disabled={disabled}
        value={(value[G(n, "why_measure") as keyof Parts] as string) ?? ""}
        onChange={handleText(G(n, "why_measure") as keyof Parts)}
      />
      <label>My plan for monitoring progress</label>
      <TArea
        disabled={disabled}
        value={(value[G(n, "monitoring_plan") as keyof Parts] as string) ?? ""}
        onChange={handleText(G(n, "monitoring_plan") as keyof Parts)}
      />
      <label>Success criteria</label>
      <TArea
        disabled={disabled}
        value={(value[G(n, "success_criteria") as keyof Parts] as string) ?? ""}
        onChange={handleText(G(n, "success_criteria") as keyof Parts)}
      />
      <label>By when (Timeline)</label>
      <TInput
        disabled={disabled}
        value={(value[G(n, "timeline") as keyof Parts] as string) ?? ""}
        onChange={handleText(G(n, "timeline") as keyof Parts)}
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

  const setField =
    (k: keyof Parts) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const base: Parts = record ?? { pair_id: pairId, part_name: part };
      setRecord({ ...base, [k]: e.target.value });
    };

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
              value={(record?.[f.key] as string) ?? ""}
              onChange={setField(f.key)}
            />
          ) : (
            <TInput
              disabled={disabled}
              value={(record?.[f.key] as string) ?? ""}
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
