import React from "react";

/**
 * Admin landing (frontend) — scaffolded dashboard landing.
 * Replace data hooks with real Supabase calls or API endpoints.
 */

export default function AdminLanding() {
  // Example stats
  const stats = [
    { id: 1, label: "Open Leads", value: 24 },
    { id: 2, label: "Assigned Jobs", value: 12 },
    { id: 3, label: "Completed", value: 96 }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.id} className="hero-card">
            <div className="text-gray-500 text-sm">{s.label}</div>
            <div className="mt-2 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 hero-card">
        <h2 className="text-xl font-semibold">Recent Leads</h2>
        <div className="mt-4 text-sm text-gray-600">
          This area will list recent leads and quick actions (assign, view details). Connect to Supabase to populate.
        </div>
      </div>
    </div>
  );
}
