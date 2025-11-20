import React from 'react';
import { Link } from 'react-router-dom';

export default function Home(){
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Contractor Portal</h1>
      <p className="mb-6">Sign in to view your assigned leads and update job statuses.</p>
      <div className="flex gap-3">
        <Link to="/auth" className="px-4 py-2 border rounded">Sign in</Link>
        <Link to="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded">Dashboard</Link>
      </div>
    </div>
  );
}
