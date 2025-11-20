import React from "react";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold">D</div>
          <div className="font-semibold">Dyllon's Service Point</div>
        </Link>

        <nav className="flex items-center gap-4">
          <Link to="/auth" className="text-sm">Sign in</Link>
          <Link to="/admin" className="btn-primary text-sm bg-brand-500 text-white px-4 py-2 rounded-md">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
