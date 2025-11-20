import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function ContractorDashboard(){
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);

  useEffect(()=>{
    const s = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if(session?.user) fetchLeads(session.user.email);
    });

    // check current session
    supabase.auth.getSession().then(({data}) => {
      setUser(data.session?.user ?? null);
      if(data.session?.user) fetchLeads(data.session.user.email);
    });

    return () => s?.subscription?.unsubscribe?.();
  }, []);

  async function fetchLeads(email){
    const { data, error } = await supabase.from('leads').select('*').eq('assigned_to', email).order('created_at', { ascending: false });
    if(error) return console.error(error);
    setLeads(data || []);
  }

  async function updateStatus(leadId, status){
    const { data, error } = await supabase.from('leads').update({ status }).eq('id', leadId).select().single();
    if(error) return console.error(error);
    setLeads(prev => prev.map(l => l.id === leadId ? {...l, status} : l));
  }

  function signOut(){
    supabase.auth.signOut();
    setUser(null);
    setLeads([]);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Leads</h1>
        <div>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">{user.email}</div>
              <button onClick={signOut} className="px-3 py-1 border rounded">Sign out</button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Not signed in</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {leads.map(l => (
          <div key={l.id} className="card flex justify-between items-center">
            <div>
              <div className="font-semibold">{l.name} <span className="text-sm text-gray-500">({l.status})</span></div>
              <div className="text-sm text-gray-600">{l.description}</div>
              <div className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button onClick={()=>updateStatus(l.id, 'in progress')} className="px-3 py-1 border rounded">In Progress</button>
              <button onClick={()=>updateStatus(l.id, 'completed')} className="px-3 py-1 bg-green-600 text-white rounded">Complete</button>
            </div>
          </div>
        ))}
        {leads.length === 0 && <div className="text-sm text-gray-500">No leads assigned yet.</div>}
      </div>
    </div>
  );
}
