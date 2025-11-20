import React from "react";
import { Link } from "react-router-dom";

/**
 * Home page — uses the "top blocks" layout:
 * - Leads count
 * - Why choose us
 * - Contractors credited
 * - Long hero box with CTA
 */

export default function Home() {
  // Example numbers — replace with API calls to Supabase/Backend
  const leadsCount = 128; // make up realistic number or fetch from supabase
  const contractorsCredited = 54;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="hero-card">
          <div className="text-sm uppercase text-gray-500">Leads so far</div>
          <div className="mt-2 text-3xl font-bold">{leadsCount}</div>
          <div className="mt-3 text-sm text-gray-600">Quality leads from verified clients</div>
        </div>

        <div className="hero-card">
          <div className="text-sm uppercase text-gray-500">Why choose us</div>
          <div className="mt-2 text-xl font-semibold">Trusted, Local Contractors</div>
          <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
            <li>Verified pros</li>
            <li>Fast lead matching</li>
            <li>Secure payments</li>
          </ul>
        </div>

        <div className="hero-card">
          <div className="text-sm uppercase text-gray-500">Contractors credited</div>
          <div className="mt-2 text-3xl font-bold">{contractorsCredited}</div>
          <div className="mt-3 text-sm text-gray-600">Active contractors in your area</div>
        </div>
      </div>

      <div className="mt-8 hero-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold">Get matched with the right contractor</h2>
            <p className="mt-2 text-gray-600">We connect homeowners with experienced professionals quickly and reliably.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/auth" className="px-4 py-2 rounded-md border">Sign in</Link>
            <a href="/admin" className="px-4 py-2 rounded-md bg-brand-500 text-white">Go to Admin</a>
          </div>
        </div>
      </div>
    </div>
  );
}
