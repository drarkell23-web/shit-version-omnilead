import React, { useState } from 'react';
import axios from 'axios';

export default function Login(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [msg,setMsg]=useState('');

  async function handleSubmit(e){
    e.preventDefault();
    setMsg('Logging in...');
    try{
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/admin/login`, { email, password });
      const { token } = res.data;
      localStorage.setItem('admin_token', token);
      window.location.href = '/';
    }catch(err){
      setMsg(err.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Admin Login</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="border rounded px-3 py-2"/>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="border rounded px-3 py-2"/>
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Login</button>
          {msg && <div className="text-sm text-red-500 mt-2">{msg}</div>}
        </form>
      </div>
    </div>
  );
}
