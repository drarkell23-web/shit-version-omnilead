import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard(){
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ totalLeads: 0 });

  useEffect(()=> {
    fetchLeads();
    fetchStats();
  }, []);

  async function fetchLeads(){
    const token = localStorage.getItem('admin_token');
    const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/admin/leads`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setLeads(res.data.leads || []);
  }

  async function fetchStats(){
    const token = localStorage.getItem('admin_token');
    const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setStats(res.data || {});
  }

  async function assignLead(leadId){
    const contractorId = prompt('Enter contractor id/email to assign to:');
    if(!contractorId) return;
    const token = localStorage.getItem('admin_token');
    await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/admin/assign`,
      { leadId, contractorId }, { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchLeads();
    fetchStats();
  }

  function logout(){
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div>
          <button onClick={logout} className="px-3 py-1 border rounded">Logout</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-sm text-gray-500">Total Leads</div>
          <div className="text-2xl font-semibold">{stats.totalLeads}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Placeholder</div>
          <div className="text-2xl font-semibold">—</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Placeholder</div>
          <div className="text-2xl font-semibold">—</div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Recent Leads</h2>
        <div className="space-y-3">
          {leads.map(l=>(
            <div key={l.id} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-semibold">{l.name} — <span className="text-sm text-gray-500">{l.status}</span></div>
                <div className="text-sm text-gray-600">{l.description}</div>
                <div className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</div>
              </div>
              <div className="flex flex-col items-end">
                <button onClick={()=>assignLead(l.id)} className="px-3 py-1 bg-blue-600 text-white rounded mb-2">Assign</button>
                <div className="text-sm text-gray-500">{l.assigned_to || 'Unassigned'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
