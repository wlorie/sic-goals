# Build the full updated file content in a here-string
$new = @'
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

  /* ========= Part I (2 goals rendered in UI) ========= */
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

  /* legacy Goal 3 columns may exist in DB; UI won’t render them */
  goal_statement3?: string | null;
  why_goal3?: string | null;
  measure3?: string | null;
  why_measure3?: string | null;
  monitoring_plan3?: string | null;
  success_criteria3?: string | null;
  timeline3?: string | null;

  /* ========= Part II (A/B/C + two-goal forms for B & C) ========= */
  p2_choice?: "A" | "B" | "C" | null;

  // Option B: Final Goals (2 goals x 4 fields)
  p2_final_goal_statement1?: string | null;
  p2_final_measure1?: string | null;
  p2_final_success_criteria1?: string | null;
  p2_final_timeline1?: string | null;

  p2_final_goal_statement2?: string | null;
  p2_final_measure2?: string | null;
  p2_final_success_criteria2?: string | null;
  p2_final_timeline2?: string | null;

  // Option C: Evaluator Proposed Goals (2 goals x 4 fields)
  p2_proposed_goal_statement1?: string | null;
  p2_proposed_measure1?: string | null;
  p2_proposed_success_criteria1?: string | null;
  p2_proposed_timeline1?: string | null;

  p2_proposed_goal_statement2?: string | null;
  p2_proposed_measure2?: string | null;
  p2_proposed_success_criteria2?: string | null;
  p2_proposed_timeline2?: string | null;

  // Option C rationale
  p2_rationale?: string | null;

  /* ========= Part III (Resolution flow) ========= */
  p3_choice?: "A" | "B" | "C" | null;
  p3_reason?: string | null;

  // Final goals for Part 3 (always present; 2 goals x 4 fields)
  p3_final_goal_statement1?: string | null;
  p3_final_measure1?: string | null;
  p3_final_success_criteria1?: string | null;
  p3_final_timeline1?: string | null;

  p3_final_goal_statement2?: string | null;
  p3_final_measure2?: string | null;
  p3_final_success_criteria2?: string | null;
  p3_final_timeline2?: string | null;

  /* ========= Part IV (End of evaluation period) ========= */
  p4_goal_statement1?: string | null;
  p4_goal_revised1?: "yes" | "no" | null;
  p4_goal_met1?: "met" | "not met" | "partially met" | null;
  p4_goal_comment1?: string | null;

  p4_goal_statement2?: string | null;
  p4_goal_revised2?: "yes" | "no" | null;
  p4_goal_met2?: "met" | "not met" | "partially met" | null;
  p4_goal_comment2?: string | null;
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
        .maybeSingle();

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

    const { error } = await supabase.from("parts").upsert(row, { onConflict: "pair_id,part_name" });

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

  /* ---- Part 1 type + guard ---- */
  type Part1Value = Partial<Parts> & { pair_id: string; part_name: "Part1" };
  function isPart1(p: Parts | null): p is Part1Value {
    return !!p && p.part_name === "Part1";
  }
  const part1Value: Part1Value = isPart1(data) ? data : { pair_id: pairId, part_name: "Part1" };

  if (!email)
    return (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        Checking session... <a href="/login">Login</a>
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
              {(p.educator_name || "Educator")} (Educator) {" | "}
              {(p.evaluator_name || "Evaluator")} (Evaluator) {" | "}
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
              const base: Part1Value = isPart1(prev) ? prev : { pair_id: pairId, part_name: "Part1" };
              return { ...base, ...fields } as Part1Value;
            })
          }
          onSave={() => save()}
          disabled={!canEdit || saving}
          canEdit={canEdit}
        />
      )}

      {/* Part II */}
      {part === "Part2" && (
        <Part2
          record={data ?? { pair_id: pairId, part_name: "Part2" }}
          setRecord={setData}
          onSave={() => save()}
          canEdit={canEdit}
          saving={saving}
        />
      )}

      {/* Part III (Resolution) */}
      {part === "Part3" && (
        <Part3Resolution
          record={data ?? { pair_id: pairId, part_name: "Part3" }}
          setRecord={setData}
          onSave={() => save()}
          canEdit={canEdit}
          saving={saving}
        />
      )}

      {/* Part IV */}
      {part === "Part4" && (
        <div>
          {!canEdit && <ReadOnlyNotice />}

          <p>Please complete this part at the end of the evaluation period.</p>
          <hr />
          <p>
            For each goal, please insert the final goal statement (from Part 2). If the goal has changed
            during the review period, then write the new, revised goal. Then, indicate whether the goal
            was met, not met, or partially met. Please comment on why or how the goal was met, not met,
            or partially met.
          </p>
          <hr />

          <Part4GoalBox
            n={1}
            record={data ?? { pair_id: pairId, part_name: "Part4" }}
            setField={(k, v) => setData({ ...(data ?? { pair_id: pairId, part_name: "Part4" }), [k]: v })}
            disabled={!canEdit || saving}
          />

          <Part4GoalBox
            n={2}
            record={data ?? { pair_id: pairId, part_name: "Part4" }}
            setField={(k, v) => setData({ ...(data ?? { pair_id: pairId, part_name: "Part4" }), [k]: v })}
            disabled={!canEdit || saving}
          />

          <button
            disabled={!canEdit || saving}
            onClick={() => save()}
            style={{
              padding: "8px 12px",
              border: "1px solid #333",
              background: !canEdit || saving ? "#888" : "#111",
              color: "#fff",
              borderRadius: 8,
              marginTop: 8,
            }}
          >
            Save
          </button>
        </div>
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

function ReadOnlyNotice() {
  return (
    <div style={{ padding: 8, margin: "8px 0", border: "1px solid #eee", borderRadius: 8 }}>
      Read-only view
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
function Part1({
  value,
  onChange,
  onSave,
  disabled,
  canEdit,
}: {
  value: { pair_id: string; part_name: "Part1" } & Partial<Parts>;
  onChange: (f: Partial<Parts>) => void;
  onSave: () => void;
  disabled: boolean;
  canEdit: boolean;
}) {
  const GOAL_COUNT = 2; // render two goals

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
      {!canEdit && <ReadOnlyNotice />}

      {Array.from({ length: GOAL_COUNT }, (_, i) => i + 1).map(block)}

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
    </div>
  );
}

/* =========================
   Shared: Deselectable radio + goal box
========================= */
function DeselectableRadio({
  name,
  value,
  current,
  onChange,
  disabled,
  label,
}: {
  name: string;
  value: "A" | "B" | "C";
  current: "A" | "B" | "C" | null;
  onChange: (v: "A" | "B" | "C" | null) => void;
  disabled: boolean;
  label: ReactNode;
}) {
  const checked = current === value;
  return (
    <label style={{ display: "block", marginBottom: 8 }}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        onClick={() => {
          if (checked) onChange(null);
        }}
        style={{ marginRight: 8 }}
      />
      {label}
    </label>
  );
}

function GoalBox({
  n,
  prefix,
  record,
  setField,
  disabled,
  title,
}: {
  n: 1 | 2;
  prefix: "p2_final_" | "p2_proposed_" | "p3_final_";
  record: Parts;
  setField: (k: keyof Parts, v: string | null) => void;
  disabled: boolean;
  title: string;
}) {
  const f = (suffix: string) => `${prefix}${suffix}${n}` as keyof Parts;
  return (
    <Box title={title}>
      <label>Goal Statement</label>
      <TArea
        disabled={disabled}
        value={(record[f("goal_statement")] as string) ?? ""}
        onChange={(e) => setField(f("goal_statement"), e.target.value)}
      />
      <label>Measure/Assessment</label>
      <TInput
        disabled={disabled}
        value={(record[f("measure")] as string) ?? ""}
        onChange={(e) => setField(f("measure"), e.target.value)}
      />
      <label>Success criteria</label>
      <TArea
        disabled={disabled}
        value={(record[f("success_criteria")] as string) ?? ""}
        onChange={(e) => setField(f("success_criteria"), e.target.value)}
      />
      <label>By when (Timeline)</label>
      <TInput
        disabled={disabled}
        value={(record[f("timeline")] as string) ?? ""}
        onChange={(e) => setField(f("timeline"), e.target.value)}
      />
    </Box>
  );
}

/* =========================
   Part II (A/B/C + 2-goal flows)
========================= */
function Part2({
  record,
  setRecord,
  onSave,
  canEdit,
  saving,
}: {
  record: Parts;
  setRecord: (r: Parts | null) => void;
  onSave: () => void;
  canEdit: boolean;
  saving: boolean;
}) {
  const disabled = !canEdit || saving;

  const setField = (k: keyof Parts, v: string | null) => {
    setRecord({ ...(record ?? {}), [k]: v } as Parts);
  };

  const choice = (record.p2_choice ?? null) as "A" | "B" | "C" | null;
  const setChoice = (v: "A" | "B" | "C" | "null" | null) => setField("p2_choice", v as any);

  return (
    <div>
      {!canEdit && <ReadOnlyNotice />}

      <p>Please select one of the following three options. After our conversation, we:</p>

      {/* A */}
      <DeselectableRadio
        name="p2_choice"
        value="A"
        current={choice}
        onChange={(v) => setChoice(v)}
        disabled={disabled}
        label={<b>A. Agree with the goals of Part 1.</b>}
      />
      {choice === "A" && (
        <p style={{ fontWeight: 700, margin: "6px 0 12px 26px" }}>
          The goal-setting process is complete.
        </p>
      )}

      {/* B */}
      <DeselectableRadio
        name="p2_choice"
        value="B"
        current={choice}
        onChange={(v) => setChoice(v)}
        disabled={disabled}
        label={
          <span>
            <b>
              B. Agree to changes to the goals of Part 1 and{" "}
              <u>have no disagreements preventing the finalization of the goals.</u>
            </b>
          </span>
        }
      />
      {choice === "B" && (
        <div style={{ marginLeft: 26 }}>
          <div style={{ fontWeight: 700, margin: "6px 0" }}>Final Goals</div>
          <GoalBox
            n={1}
            prefix="p2_final_"
            record={record}
            setField={setField}
            disabled={disabled}
            title="Goal 1"
          />
          <GoalBox
            n={2}
            prefix="p2_final_"
            record={record}
            setField={setField}
            disabled={disabled}
            title="Goal 2"
          />
          <p style={{ fontWeight: 700, marginTop: 6 }}>The goal-setting process is complete.</p>
        </div>
      )}

      {/* C */}
      <DeselectableRadio
        name="p2_choice"
        value="C"
        current={choice}
        onChange={(v) => setChoice(v)}
        disabled={disabled}
        label={<b>C. Do not agree on goals.</b>}
      />
      {choice === "C" && (
        <div style={{ marginLeft: 26 }}>
          <p style={{ fontWeight: 700, marginTop: 8 }}>Evaluator Proposed Goals</p>
          <GoalBox
            n={1}
            prefix="p2_proposed_"
            record={record}
            setField={setField}
            disabled={disabled}
            title="Goal 1"
          />
          <GoalBox
            n={2}
            prefix="p2_proposed_"
            record={record}
            setField={setField}
            disabled={disabled}
            title="Goal 2"
          />

          <Box title="Evaluator: Please explain briefly why you support these goals:">
            <TArea
              disabled={disabled}
              value={record.p2_rationale ?? ""}
              onChange={(e) => setField("p2_rationale", e.target.value)}
            />
          </Box>

          <p style={{ fontWeight: 700 }}>Goal-setting will proceed to the resolution process.</p>
        </div>
      )}

      <button
        disabled={disabled}
        onClick={onSave}
        style={{
          padding: "8px 12px",
          border: "1px solid #333",
          background: disabled ? "#888" : "#111",
          color: "#fff",
          borderRadius: 8,
          marginTop: 8,
        }}
      >
        Save
      </button>
    </div>
  );
}

/* =========================
   Part III (Resolution) – A/B/C + reason + final goals
========================= */
function Part3Resolution({
  record,
  setRecord,
  onSave,
  canEdit,
  saving,
}: {
  record: Parts;
  setRecord: (r: Parts | null) => void;
  onSave: () => void;
  canEdit: boolean;
  saving: boolean;
}) {
  const disabled = !canEdit || saving;
  const setField = (k: keyof Parts, v: string | null) => {
    setRecord({ ...(record ?? {}), [k]: v } as Parts);
  };

  const choice = (record.p3_choice ?? null) as "A" | "B" | "C" | null;
  const setChoice = (v: "A" | "B" | "C" | null) => setField("p3_choice", v);

  return (
    <div>
      {!canEdit && <ReadOnlyNotice />}

      <p>
        Please review Parts 1 and 2 and the{" "}
        <a
          href="https://drive.google.com/file/d/1SzKk2RMNgtvm_lWXHJiXjlZ1_qocQT39/view"
          target="_blank"
          rel="noreferrer"
        >
          SIC goal-setting resolution and process and guidelines
        </a>
        .
      </p>

      <p>
        Your role is to resolve the disagreement between the Educator and their Evaluator. You may
        (A) agree with the goals of Part I, including any changes agreed to by the Educator and
        Evaluator, or (B) agree with the Evaluator's alternative goals. Please provide reasons for
        your decision. If you have met with the Educator and Evaluator, and they have agreed to
        reformulated goals (Option C), you can indicate that here.
      </p>

      <p>Please write the final goals here, regardless of the option selected.</p>

      <hr style={{ margin: "12px 0" }} />

      <p>Upon reviewing the relevant documentation and the goal-setting resolution process and guidelines, I:</p>

      {/* A */}
      <DeselectableRadio
        name="p3_choice"
        value="A"
        current={choice}
        onChange={setChoice}
        disabled={disabled}
        label={
          <span>
            <b>
              (A) Support the goals of Part 1 and (if applicable) any agreed-upon revision to those.
            </b>{" "}
            Please write the final goals in the goal boxes below.
          </span>
        }
      />

      {/* B */}
      <DeselectableRadio
        name="p3_choice"
        value="B"
        current={choice}
        onChange={setChoice}
        disabled={disabled}
        label={
          <span>
            <b>(B) Support the alternative goals proposed by the Evaluator.</b> Please write the
            final goals in the goal boxes below.
          </span>
        }
      />

      {/* Reason */}
      <Box title="Reason for my decision:">
        <TArea
          disabled={disabled}
          value={record.p3_reason ?? ""}
          onChange={(e) => setField("p3_reason", e.target.value)}
        />
      </Box>

      {/* C */}
      <DeselectableRadio
        name="p3_choice"
        value="C"
        current={choice}
        onChange={setChoice}
        disabled={disabled}
        label={
          <span>
            <b>
              (C) Have met with the Educator and Evaluator, and they have agreed to reformulated
              goals.
            </b>{" "}
            Please write the final goals in the goal boxes below.
          </span>
        }
      />

      <hr style={{ margin: "12px 0" }} />

      <p style={{ fontWeight: 700, marginBottom: 6 }}>The following are final goals for Part 3.</p>

      {/* Final Goals */}
      <GoalBox
        n={1}
        prefix="p3_final_"
        record={record}
        setField={setField}
        disabled={disabled}
        title="Goal 1"
      />
      <GoalBox
        n={2}
        prefix="p3_final_"
        record={record}
        setField={setField}
        disabled={disabled}
        title="Goal 2"
      />

      <button
        disabled={disabled}
        onClick={onSave}
        style={{
          padding: "8px 12px",
          border: "1px solid #333",
          background: disabled ? "#888" : "#111",
          color: "#fff",
          borderRadius: 8,
          marginTop: 8,
        }}
      >
        Save
      </button>
    </div>
  );
}

/* =========================
   Part IV goal widget
========================= */
function Part4GoalBox({
  n,
  record,
  setField,
  disabled,
}: {
  n: 1 | 2;
  record: Parts;
  setField: (k: keyof Parts, v: string | null) => void;
  disabled: boolean;
}) {
  const s = (suffix: string) => `p4_goal_${suffix}${n}` as keyof Parts;

  return (
    <Box title={`Goal ${n}`}>
      <label>{`Goal ${n} Statement`}</label>
      <TArea
        disabled={disabled}
        value={(record[s("statement")] as string) ?? ""}
        onChange={(e) => setField(s("statement"), e.target.value)}
      />

      <label>Was this goal revised (from Part 2 or 3) during the review period?</label>
      <select
        disabled={disabled}
        value={(record[s("revised")] as string) ?? ""}
        onChange={(e) => setField(s("revised"), e.target.value)}
      >
        <option value="">-- select --</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>

      <label>This goal was</label>
      <select
        disabled={disabled}
        value={(record[s("met")] as string) ?? ""}
        onChange={(e) => setField(s("met"), e.target.value)}
      >
        <option value="">-- select --</option>
        <option value="met">Met</option>
        <option value="not met">Not met</option>
        <option value="partially met">Partially met</option>
      </select>

      <label>Please comment</label>
      <TArea
        disabled={disabled}
        value={(record[s("comment")] as string) ?? ""}
        onChange={(e) => setField(s("comment"), e.target.value)}
      />
    </Box>
  );
}
'@

# Write the file as UTF-8 WITHOUT BOM (avoids weird characters in Next.js)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText("app/app/page.tsx", $new, $utf8NoBom)
