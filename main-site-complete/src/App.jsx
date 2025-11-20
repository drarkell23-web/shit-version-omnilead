import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AdminLanding from "./pages/AdminLanding";
import Auth from "./pages/Auth";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminLanding />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
