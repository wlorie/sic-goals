"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const send = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined'
            ? window.location.origin + '/app'
            : undefined
      }
    });
    if (error) alert(error.message);
    else setSent(true);
  };

  return (
    <main style={{ maxWidth: 420, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Pilot Data Entry</h1>
      <p>Enter your email to receive a secure link.</p>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@your.org"
        style={{ width: '100%', padding: 8 }}
      />
      <button onClick={send} style={{ marginTop: 10 }}>
        Send magic link
      </button>
      {sent && <p>Check your email for the secure link.</p>}
    </main>
  );
}
