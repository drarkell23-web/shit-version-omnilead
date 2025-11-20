import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function Auth(){
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  async function handleSignIn(e){
    e.preventDefault();
    setMsg('Sending sign-in link...');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if(error) setMsg(error.message);
    else setMsg('Check your email for the sign-in link.');
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card">
        <h2 className="text-xl font-semibold mb-3">Contractor Sign In</h2>
        <form onSubmit={handleSignIn} className="flex flex-col gap-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" className="border rounded px-3 py-2"/>
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Send sign-in link</button>
        </form>
        {msg && <div className="mt-3 text-sm text-gray-600">{msg}</div>}
      </div>
    </div>
  );
}
