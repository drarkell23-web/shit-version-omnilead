import React from 'react';
import { Link } from 'react-router-dom';

export default function Header(){
  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="font-semibold">Dyllon's Service Point</Link>
        <nav className="flex gap-4">
          <Link to="/auth" className="text-sm">Sign in</Link>
          <Link to="/dashboard" className="text-sm">Dashboard</Link>
        </nav>
      </div>
    </header>
  );
}
