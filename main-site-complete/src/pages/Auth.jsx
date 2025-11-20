import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Auth() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function handleMagicLink(e) {
    e.preventDefault();
    setMessage("Sending sign-in link...");

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setMessage(error.message);
    else setMessage("Check your email for a sign-in link.");
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="hero-card">
        <h2 className="text-xl font-semibold">Sign in or Register</h2>
        <form onSubmit={handleMagicLink} className="mt-4">
          <label className="block text-sm text-gray-600">Email</label>
          <input
            className="mt-2 w-full border rounded-md px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
          />
          <button className="mt-4 w-full bg-brand-500 text-white py-2 rounded-md">Send sign-in link</button>
        </form>
        {message && <div className="mt-3 text-sm text-gray-600">{message}</div>}
      </div>
    </div>
  );
}
