// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) router.replace("/app");
      else router.replace("/login");
    })();
  }, [router]);

  return <p style={{ padding: 20, fontFamily: "system-ui" }}>Redirecting…</p>;
}
