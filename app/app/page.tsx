"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";

/* ========== Types ========== */

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
  part_name: "Part1" | "Part2" | "Part3" | "Part4";

  // Part1
  goal_statement1?: string | null; why_goal1?: string | null; measure1?: string | null; why_measure1?: string | null;
  monitoring_plan1?: string | null; success_criteria1?: string | null; timeline1?: string | null;
  goal_statement2?: string | null; why_goal2?: string | null; measure2?: string | null; why_measure2?: string | null;
  monitoring_plan2?: string | null; success_criteria2?: string | null; timeline2?: string | null;
  alignment_toa?: string | null; alignment_dpas_dtgss?: string | null;

  // Part2
  p2_choice?: "A" | "B" | "C" | null;
  p2_rationale?: string | null;
  p2_final_goal_statement1?: string | null; p2_final_measure1?: string | null; p2_final_success_criteria1?: string | null; p2_final_timeline1?: string | null;
  p2_final_goal_statement2?: string | null; p2_final_measure2?: string | null; p2_final_success_criteria2?: string | null; p2_final_timeline2?: string | null;
  p2_proposed_goal_statement1?: string | null; p2_proposed_measure1?: string | null; p2_proposed_success_criteria1?: string | null; p2_proposed_timeline1?: string | null;
  p2_proposed_goal_statement2?: string | null; p2_proposed_measure2?: string | null; p2_proposed_success_criteria2?: string | null; p2_proposed_timeline2?: string | null;

  // Part3
  p3_choice?: "A" | "B" | "C" | null;
  p3_reason?: string | null;
  p3_final_goal_statement1?: string | null; p3_final_measure1?: string | null; p3_final_success_criteria1?: string | null; p3_final_timeline1?: string | null;
  p3_final_goal_statement2?: string | null; p3_final_measure2?: string | null; p3_final_success_criteria2?: string | null; p3_final_timeline2?: string | null;

  // Part4
  p4_goal_statement1?: string | null; p4_revised1?: "yes" | "no" | null;
  p4_status1?: "met" | "not met" | "partially met" | null;
  p4_comment1?: string | null;
  p4_goal_statement2?: string | null; p4_revised2?: "yes" | "no" | null;
  p4_status2?: "met" | "not met" | "partially met" | null;
  p4_comment2?: string | null;
};


/* ========== UI helpers: Banner & Spinner & Primitives ========== */

type BannerKind = "success" | "error" | "info";
function Banner({ kind, children }: { kind: BannerKind; children: React.ReactNode }) {
  const color = kind === "success" ? "#155724" : kind === "error" ? "#721c24" : "#0c5460";
  const bg = kind === "success" ? "#d4edda" : kind === "error" ? "#f8d7da" : "#d1ecf1";
  const border = kind === "success" ? "#c3e6cb" : kind === "error" ? "#f5c6cb" : "#bee5eb";
  return (
    <div style={{ padding: 10, borderRadius: 8, border: `1px solid ${border}`, color, background: bg, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Spinner({ label }: { label?: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <div
        aria-label="loading"
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "2px solid #ccc",
          borderTopColor: "#111",
          animation: "spin 1s linear infinite",
        }}
      />
      {label && <span>{label}</span>}
      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

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


function NextStep({ role, children }: { role: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 8,
        border: "1px dashed #cbd5e1",
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
      <b>{role}:</b> <span style={{ lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}


/* =========================
   Admin Link (optional)
========================= */


function AdminLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;
      const { data } = await supabase.rpc("is_admin");
      setShow(!!data);
    })();
  }, []);

  if (!show) return null;
  return (
    <a
      href="/admin"
      style={{
        marginLeft: 16,
        textDecoration: "underline",
        color: "#0645AD",
      }}
    >
      Admin
    </a>
  );
}



/* ========== Small helpers ========== */

function shallowEqual<T extends object>(a: T | null, b: T | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ak = Object.keys(a) as (keyof T)[];
  const bk = Object.keys(b) as (keyof T)[];
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

/* ========== Main Component ========== */

export default function AppPage() {
  const [email, setEmail] = useState<string>("");
  const [pairs, setPairs] = useState<Roster[]>([]);
  const [pairId, setPairId] = useState<string>("");
  const [part, setPart] = useState<PartName>("Part1");
  const [data, setData] = useState<Parts | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ kind: BannerKind; msg: string } | null>(null);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(false);
  const [loadingPart, setLoadingPart] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Parts | null>(null);

  // Session email
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const e = data.user?.email ?? "";
      setEmail(e.toLowerCase());
    });
  }, []);

  // Load roster (RLS will restrict)
  useEffect(() => {
    if (!email) return;
    setLoadingRoster(true);
    (async () => {
      const { data, error } = await supabase.from("roster").select("*");
      setLoadingRoster(false);
      if (error) {
        console.warn(error);
        setBanner({ kind: "error", msg: error.message });
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
    setBanner(null);
    setLoadingPart(true);
    (async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("*")
        .eq("pair_id", pairId)
        .eq("part_name", part)
        .maybeSingle();
      setLoadingPart(false);
      if (error) {
        console.warn(error);
        setBanner({ kind: "error", msg: error.message });
      }
      setData((data as Parts) ?? null);
      setLastSaved((data as Parts) ?? null);
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
    setBanner(null);

    const base: Parts = data ?? { pair_id: pairId, part_name: part };
    const row: Parts = { ...base, ...(fields ?? {}) };

    const { error } = await supabase.from("parts").upsert(row, { onConflict: "pair_id,part_name" });
    setSaving(false);

    if (error) {
      setBanner({ kind: "error", msg: error.message });
      return;
    }

    // Re-fetch the saved row for accuracy
    const res = await supabase
      .from("parts")
      .select("*")
      .eq("pair_id", pairId)
      .eq("part_name", part)
      .maybeSingle();

    if (!res.error) {
      const fresh = (res.data as Parts) ?? row;
      setData(fresh);
      setLastSaved(fresh);
      setBanner({ kind: "success", msg: "Saved" });
      setTimeout(() => setBanner(null), 1500);
    } else {
      setBanner({ kind: "error", msg: res.error.message });
    }
  }

  

  /* Part 1 type guard to always pass literal "Part1" */
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

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login"; // redirect to login page
  }


  return (
    <main style={{ maxWidth: 1000, margin: "20px auto", fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
  <div><b>SIC Goals Portal</b></div>
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    {email}
    <AdminLink />

<button
      onClick={handleLogout}
      style={{
        padding: "4px 8px",
        borderRadius: 6,
        border: "1px solid #ccc",
        background: "#fff",
        cursor: "pointer",
      }}
    >
      Log out
    </button>



  </div>
</header>


      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <label>Pair</label>
        <select value={pairId} onChange={(e) => setPairId(e.target.value)}>
          {pairs.map((p) => (
            <option key={p.pair_id} value={p.pair_id}>
              {(p.educator_name || "Educator")} (Educator) - {(p.evaluator_name || "Evaluator")} (Evaluator) - {(p.resolution_name || "Resolution")} (Resolution)
            </option>
          ))}
        </select>
        {loadingRoster && <Spinner label="Loading pairs..." />}

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

      {banner && <Banner kind={banner.kind}>{banner.msg}</Banner>}
      {loadingPart && <div style={{ marginBottom: 8 }}><Spinner label={`Loading ${part}...`} /></div>}

      {/* Part 1 */}
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

      {/* Part 2 */}
      {part === "Part2" && (
        <Part2
          record={data ?? { pair_id: pairId, part_name: "Part2" }}
          setRecord={setData}
          onSave={() => save()}
          canEdit={canEdit}
          saving={saving}
        />
      )}

      {/* Part 3 */}
      {part === "Part3" && (
        <Part3Resolution
          record={data ?? { pair_id: pairId, part_name: "Part3" }}
          setRecord={setData}
          onSave={() => save()}
          canEdit={canEdit}
          saving={saving}
        />
      )}

      {/* Part 4 */}
      {part === "Part4" && (
        <Part4Section
          pairId={pairId}
          record={data ?? { pair_id: pairId, part_name: "Part4" }}
          setRecord={setData}
          onSave={() => save()}
          canEdit={canEdit}
          saving={saving}
        />
      )}
    </main>
  );
}

/* =========================
   Part 1 (two goals)
========================= */

type Part1Value = Partial<Parts> & { pair_id: string; part_name: "Part1" };

function Part1({
  value,
  onChange,
  onSave,
  disabled,
  canEdit,
}: {
  value: Part1Value;
  onChange: (f: Partial<Parts>) => void;
  onSave: () => void;
  disabled: boolean;
  canEdit: boolean;
}) {
  const GOAL_COUNT = 2;

  const G = (n: number, prefix: string) => `${prefix}${n}` as const;

  const handleText =
    (key: keyof Parts) =>
    (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      onChange({ [key]: e.target.value } as Partial<Parts>);

  const block = (n: number) => (
    <Box key={n} title={`Goal ${n}`}>
<label>Goal statement</label>
<p style={{ fontStyle: "italic", margin: "4px 0 8px 0" }}>
  Please be as specific as possible. Consider, for example, sources for your goals,
  goals you have set in the past, and alignment to building-level goals.
</p>
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
<p style={{ fontStyle: "italic", margin: "4px 0 8px 0" }}>
  SIC goals are typically long-term - that is, a half-year or longer.
</p>
<TArea
  disabled={disabled}
  value={(value[G(n, "timeline") as keyof Parts] as string) ?? ""}
  onChange={handleText(G(n, "timeline") as keyof Parts)}
/>


    </Box>
  );

  return (
  <div>
    {!canEdit && <ReadOnlyNotice />}

    <Box title="Instructions">
      <p style={{ marginBottom: "16px" }}>
        <b>Educator:</b> Please complete this Part at the beginning of the evaluation period.
      </p>
      <p style={{ marginBottom: "16px" }}>
        Write your student improvement component goals for the year.
      </p>
      <p style={{ marginBottom: "16px" }}>
        <b>Resources:</b> What makes a good goal statement? See
        {" "}
  <a
    href="https://drive.google.com/file/d/1lADZ_CvCFqPF_QtQAat0UNkGsECAE9hf/view"
    target="_blank"
    rel="noreferrer"
    style={{ color: "#0645AD", textDecoration: "underline" }}
  >
    Quality Criteria for Goals
  </a> 
        &nbsp;and {" "}
  <a
    href="https://drive.google.com/file/d/1jbEJoxwQ0RhK9rU-wDXqzr5HuUaYLs_5/view"
    target="_blank"
    rel="noreferrer"
    style={{ color: "#0645AD", textDecoration: "underline" }}
  >
    Sample Goal Statements
  </a>.
      </p>
    </Box>

    {Array.from({ length: GOAL_COUNT }, (_, i) => i + 1).map(block)}

{/* Alignment Box */}
    <Box title="Alignment">
      <div style={{ marginBottom: "16px" }}>
        <p>
          <b>Alignment with the SIC Theory of Action (ToA):</b> How do your goals reflect
          the connection between your practices and the valued student outcomes shown in
          the SIC ToA?{" "}
          <b>Link:</b>{" "}
          <a
            href="https://drive.google.com/file/d/1_miVhxGwuKmck_Luo-bkTx2u29N7hNP6/view"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#0645AD", textDecoration: "underline" }}
          >
            The SIC Theory of Action
          </a>
        </p>
        <TArea
          disabled={disabled}
          value={value["alignment_toa"] ?? ""}
          onChange={(e) => onChange({ alignment_toa: e.target.value })}
        />
      </div>

      <div>
        <p>
          <b>Alignment with DPAS, DTGSS, and Standards of Practice:</b> Your goals should
          link to the DPAS or DTGSS rubrics (if you are a teacher, specialist, or
          administrator) and (for specialists) to the standards of
          practice for your specialty area. 
          For DPAS and DTGSS, each goal should be linked at level 3 or 4 for an
          indicator (teachers), criterion (specialists), or component (administrators).{" "}
          <b>Links:</b>{" "}
          <a
            href="https://education.delaware.gov/wp-content/uploads/2023/07/Delaware-Teacher-Classroom-Observation-Framework-2022-2023-Updated-June-16-2023.pdf"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#0645AD", textDecoration: "underline" }}
          >
            DTGSS Classroom Observation Framework
          </a>
          {", "}
          <a
            href="https://education.delaware.gov/"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#0645AD", textDecoration: "underline" }}
          >
            DPAS II Component Rubric for Specialists
          </a>
          {", "}
          <a
            href="https://education.delaware.gov/"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#0645AD", textDecoration: "underline" }}
          >
            DPAS Guides for Administrators – Rubric
          </a>
        </p>
        <TArea
          disabled={disabled}
          value={value["alignment_dpas_dtgss"] ?? ""}
          onChange={(e) => onChange({ alignment_dpas_dtgss: e.target.value })}
        />
      </div>
    </Box>

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
<NextStep role="Educator">
  Saving this form only saves your data — it does not inform your Evaluator. When you have finished entering all your data in Part 1, inform your Evaluator. The next step in the process is to schedule your Educator—Evaluator conversation.
</NextStep>


  </div>
);

}

/* =========================
   Shared widgets for Part 2/3
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
   Part 2
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
  const setField = (k: keyof Parts, v: string | null) => setRecord({ ...(record ?? {}), [k]: v } as Parts);
  const choice = (record.p2_choice ?? null) as "A" | "B" | "C" | null;
  const setChoice = (v: "A" | "B" | "C" | null) => setField("p2_choice", v);

  return (
    <div>
      {!canEdit && <ReadOnlyNotice />}

       <Box title="Instructions">
      <p style={{ marginBottom: "16px" }}>
        <b>Evaluator:</b> Please complete this Part at after your Educator-Evaluator conversation.
      </p>
     
      
    </Box>

      <p>Please select one of the following three options. After our conversation, we:</p>

      <DeselectableRadio
        name="p2_choice"
        value="A"
        current={choice}
        onChange={setChoice}
        disabled={disabled}
        label={<b>A. Agree with the goals of Part 1.</b>}
      />
      {choice === "A" && (
        <p style={{ fontWeight: 700, margin: "6px 0 12px 26px" }}>
          The goal-setting process is complete.
        </p>
      )}

      <DeselectableRadio
        name="p2_choice"
        value="B"
        current={choice}
        onChange={setChoice}
        disabled={disabled}
        label={
          <span>
            <b>
              B. Agree to changes to the goals of Part 1 and <u>have no disagreements preventing the finalization of the goals.</u>
            </b>
          </span>
        }
      />
      {choice === "B" && (
        <div style={{ marginLeft: 26 }}>
          <div style={{ fontWeight: 700, margin: "6px 0" }}>Final Goals</div>
          <GoalBox n={1} prefix="p2_final_" record={record} setField={setField} disabled={disabled} title="Goal 1" />
          <GoalBox n={2} prefix="p2_final_" record={record} setField={setField} disabled={disabled} title="Goal 2" />
          <p style={{ fontWeight: 700, marginTop: 6 }}>The goal-setting process is complete.</p>
        </div>
      )}

      <DeselectableRadio
        name="p2_choice"
        value="C"
        current={choice}
        onChange={setChoice}
        disabled={disabled}
        label={<b>C. Do not agree on goals.</b>}
      />
      {choice === "C" && (
        <div style={{ marginLeft: 26 }}>
          <p style={{ fontWeight: 700, marginTop: 8 }}>Evaluator Proposed Goals</p>
          <GoalBox n={1} prefix="p2_proposed_" record={record} setField={setField} disabled={disabled} title="Goal 1" />
          <GoalBox n={2} prefix="p2_proposed_" record={record} setField={setField} disabled={disabled} title="Goal 2" />

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
<NextStep role="Evaluator">
  Saving this form only saves your data — it does not inform the Educator or Resolution staff member. 
  After finishing Part 2, inform your Educator. If you selected “C”, notify in addition the Resolution staff member to begin Part 3.
</NextStep>


    </div>
  );
}

/* =========================
   Part 3 (Resolution)
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
  const setField = (k: keyof Parts, v: string | null) => setRecord({ ...(record ?? {}), [k]: v } as Parts);
  const choice = (record.p3_choice ?? null) as "A" | "B" | "C" | null;
  const setChoice = (v: "A" | "B" | "C" | null) => setField("p3_choice", v);

  return (
    <div>
      {!canEdit && <ReadOnlyNotice />}
<p style={{ marginBottom: "16px" }}>
  <b>Complete Part 3 ONLY if educator and evaluator do not agree on goals after  
  their Part 2 conversation.</b>
</p>
<Box title="Instructions">
<p style={{ marginBottom: "16px" }}>
 <b>Resolution staff member:</b> Please review Parts 1 and 2 and the{" "}
  <a
    href="https://drive.google.com/file/d/1SzKk2RMNgtvm_lWXHJiXjlZ1_qocQT39/view"
    target="_blank"
    rel="noreferrer"
    style={{ color: "#0645AD", textDecoration: "underline" }}
  >
    SIC goal-setting resolution and process and guidelines
  </a>.
</p>

      <p style={{ marginBottom: "16px" }}>
        Your role is to resolve the disagreement between the Educator and their Evaluator. You may
        (A) agree with the goals of Part 1, including any changes agreed to by the Educator and
        Evaluator, or (B) agree with the Evaluator&apos;s alternative goals. Please provide reasons for
        your decision. If you have met with the Educator and Evaluator, and they have agreed to
        reformulated goals (Option C), you can indicate that here.
      </p>

      <p>Please write the final goals here, regardless of the option selected.</p>
</Box>
      

      <p>Upon reviewing the relevant documentation and the goal-setting resolution process and guidelines, I:</p>

      <DeselectableRadio
        name="p3_choice"
        value="A"
        current={choice}
        onChange={setChoice}
        disabled={disabled}
        label={
          <span>
            <b>(A) Support the goals of Part 1 and (if applicable) any agreed-upon revision to those.</b> Please write the final goals in the goal boxes below.
          </span>
        }
      />

      <DeselectableRadio
        name="p3_choice"
        value="B"
        current={choice}
        onChange={setChoice}
        disabled={disabled}
        label={
          <span>
            <b>(B) Support the alternative goals proposed by the Evaluator.</b> Please write the final goals in the goal boxes below.
          </span>
        }
      />

      <Box title="Reason for my decision:">
        <TArea
          disabled={disabled}
          value={record.p3_reason ?? ""}
          onChange={(e) => setField("p3_reason", e.target.value)}
        />
      </Box>

      <DeselectableRadio
        name="p3_choice"
        value="C"
        current={choice}
        onChange={setChoice}
        disabled={disabled}
        label={
          <span>
            <b>(C) Have met with the Educator and Evaluator, and they have agreed to reformulated goals.</b> Please write the final goals in the goal boxes below.
          </span>
        }
      />

      <hr style={{ margin: "12px 0" }} />
      <p style={{ fontWeight: 700, marginBottom: 6 }}>The following are final goals for Part 3.</p>

      <GoalBox n={1} prefix="p3_final_" record={record} setField={setField} disabled={disabled} title="Goal 1" />
      <GoalBox n={2} prefix="p3_final_" record={record} setField={setField} disabled={disabled} title="Goal 2" />

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
<NextStep role="Resolution Staff">
  Saving this form only saves your data — it does not inform the Educator or Evaluator. After finishing Part 3, inform both the Educator and Evaluator.
</NextStep>


    </div>
  );
}

/* =========================
   Part 4 (Outcomes)
========================= */

function Part4Goal({
  idx,
  record,
  setRecord,
  disabled,
}: {
  idx: 1 | 2;
  record: Parts;
  setRecord: (r: Parts | null) => void;
  disabled: boolean;
}) {
  const s = (key: "goal_statement" | "revised" | "status" | "comment") =>
    (`p4_${key}${idx}` as keyof Parts);

  const setField = (k: keyof Parts, v: string | null) =>
    setRecord({ ...(record ?? {}), [k]: v } as Parts);

  return (
    <Box title={`Goal ${idx}`}>
      <label>Goal Statement</label>
      <TArea
        disabled={disabled}
        value={(record[s("goal_statement")] as string) ?? ""}
        onChange={(e) => setField(s("goal_statement"), e.target.value)}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <label htmlFor={`rev-${idx}`} style={{ margin: 0 }}>
          Was this goal revised (from Part 2 or 3) during the review period?
        </label>
        <select
          id={`rev-${idx}`}
          disabled={disabled}
          value={(record[s("revised")] as string) ?? ""}
          onChange={(e) => setField(s("revised"), e.target.value)}
          style={{ padding: 6 }}
        >
          <option value="">-- select --</option>
          <option value="yes">yes</option>
          <option value="no">no</option>
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <label htmlFor={`met-${idx}`} style={{ margin: 0 }}>
          This goal was
        </label>
        <select
          id={`met-${idx}`}
          disabled={disabled}
          value={(record[s("status")] as string) ?? ""}
          onChange={(e) => setField(s("status"), e.target.value)}
          style={{ padding: 6 }}
        >
          <option value="">-- select --</option>
          <option value="met">met</option>
          <option value="not met">not met</option>
          <option value="partially met">partially met</option>
        </select>
      </div>

      <div style={{ marginTop: 8 }}>
        <label>Please comment</label>
        <TArea
          disabled={disabled}
          value={(record[s("comment")] as string) ?? ""}
          onChange={(e) => setField(s("comment"), e.target.value)}
        />
      </div>
    </Box>
  );
}

function Part4Section({
  pairId,
  record,
  setRecord,
  onSave,
  canEdit,
  saving,
}: {
  pairId: string;
  record: Parts;
  setRecord: (r: Parts | null) => void;
  onSave: () => void;
  canEdit: boolean;
  saving: boolean;
}) {
  const disabled = !canEdit || saving;

  // Ensure we always have a Part4 row shape
  const base: Parts = record?.pair_id ? record : { pair_id: pairId, part_name: "Part4" };
  const ensurePart = (r: Parts) => (r.part_name === "Part4" ? r : { ...r, part_name: "Part4" as const });

  useEffect(() => {
    if (!record) setRecord({ pair_id: pairId, part_name: "Part4" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairId]);

  return (
    <div>
      {!canEdit && <ReadOnlyNotice />}

      <Box title="Instructions">
        <p style={{ marginBottom: "16px" }}><b>Evaluator:</b> Please complete this part at the end of the evaluation period.</p>
        
        <p style={{ marginBottom: "16px" }}>
          For each goal, please insert the final goal statement (from Part 2). If the goal has changed during the review period, then write the new,
          revised goal. Then, indicate whether the goal has been met, not met, or partially met. Please comment on why or how the goal was met, not met,
          or partially met.
        </p>
       
      </Box>

      <Part4Goal idx={1} record={ensurePart(base)} setRecord={(r) => setRecord(ensurePart(r as Parts))} disabled={disabled} />
      <Part4Goal idx={2} record={ensurePart(base)} setRecord={(r) => setRecord(ensurePart(r as Parts))} disabled={disabled} />

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

<NextStep role="Evaluator">
  Saving this form only saves your data — it does not inform the Educator. After finishing Part 4, inform the Educator that the end-of-year outcomes have been recorded.
</NextStep>


    </div>
  );
}
