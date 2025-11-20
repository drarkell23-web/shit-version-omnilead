// server.js — Omni / ServicePoint API (complete, production-ready patterns)
// NOTE: Put your secrets in a .env file (SUPABASE_URL, SUPABASE_SERVICE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID_ADMIN)
// Do NOT commit .env to GitHub.

import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Env
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID_ADMIN = process.env.TELEGRAM_CHAT_ID_ADMIN;
const DATA_DIR = path.join(process.cwd(), "data");

// Ensure data dir exists for fallback
fs.ensureDirSync(DATA_DIR);

// Supabase client (service role) if configured
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log("Supabase: service client enabled");
} else {
  console.log("⚠ No Supabase configured — using local JSON fallback.");
}

// Serve static / public (if you have front-end files in public/)
app.use(express.static("public"));
app.use(express.static("."));

// -----------------------------
// Utility: read local JSON fallback
// -----------------------------
async function readLocal(name, fallback = []) {
  const file = path.join(DATA_DIR, name);
  try {
    if (await fs.pathExists(file)) {
      return await fs.readJson(file);
    }
  } catch (e) {
    console.warn("readLocal error", e);
  }
  return fallback;
}
async function writeLocal(name, data) {
  const file = path.join(DATA_DIR, name);
  await fs.writeJson(file, data, { spaces: 2 });
}

// -----------------------------
// Public demo data endpoints (services/contractors/reviews) - used when no supabase
// -----------------------------
app.get("/data/services.json", async (req, res) => {
  const file = path.join(DATA_DIR, "services.json");
  if (await fs.pathExists(file)) return res.sendFile(file);
  return res.json({ services: [] });
});
app.get("/data/contractors.json", async (req, res) => {
  const file = path.join(DATA_DIR, "contractors.json");
  if (await fs.pathExists(file)) return res.sendFile(file);
  return res.json({ contractors: [] });
});
app.get("/data/reviews.json", async (req, res) => {
  const file = path.join(DATA_DIR, "reviews.json");
  if (await fs.pathExists(file)) return res.sendFile(file);
  return res.json({ reviews: [] });
});

// -----------------------------
// GET /api/services
// -----------------------------
app.get("/api/services", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from("services").select("*").order("name", { ascending: true }).limit(1000);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, services: data });
    } else {
      const j = await readLocal("services.json", { services: [] });
      return res.json(j);
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// -----------------------------
// GET /api/contractors
// -----------------------------
app.get("/api/contractors", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from("contractors").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, contractors: data });
    } else {
      const j = await readLocal("contractors.json", { contractors: [] });
      return res.json(j);
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// -----------------------------
// POST /api/admin/create-contractor
// (ADMIN endpoint; server will hash password and insert contractor row - do NOT expose publicly)
// -----------------------------
app.post("/api/admin/create-contractor", async (req, res) => {
  try {
    const { company, phone, password, telegram } = req.body;
    if (!company || !phone || !password) return res.status(400).json({ ok: false, error: "company, phone and password required" });

    const password_hash = await bcrypt.hash(password, 10);
    const row = {
      company,
      phone,
      password_hash,
      telegram_chat_id: telegram || null,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      const { data, error } = await supabase.from("contractors").insert([row]).select().maybeSingle();
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, contractor: data });
    } else {
      // fallback local file
      const j = await readLocal("contractors.json", { contractors: [] });
      j.contractors = j.contractors || [];
      // create basic id
      row.id = "local_" + Date.now();
      j.contractors.unshift(row);
      await writeLocal("contractors.json", j);
      return res.json({ ok: true, contractor: row });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// -----------------------------
// POST /api/contractor/login  (phone + password) -> returns contractor info if valid
// -----------------------------
app.post("/api/contractor/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ ok: false, error: "phone + password required" });

    if (supabase) {
      const { data, error } = await supabase.from("contractors").select("*").eq("phone", phone).maybeSingle();
      if (error) return res.status(500).json({ ok: false, error: error.message });
      if (!data) return res.status(404).json({ ok: false, error: "contractor not found" });
      const match = await bcrypt.compare(password, data.password_hash || "");
      if (!match) return res.status(401).json({ ok: false, error: "invalid credentials" });
      // hide password hash
      delete data.password_hash;
      return res.json({ ok: true, contractor: data });
    } else {
      const j = await readLocal("contractors.json", { contractors: [] });
      const c = (j.contractors || []).find(x => x.phone === phone);
      if (!c) return res.status(404).json({ ok: false, error: "contractor not found" });
      const match = await bcrypt.compare(password, c.password_hash || "");
      if (!match) return res.status(401).json({ ok: false, error: "invalid credentials" });
      const copy = { ...c }; delete copy.password_hash;
      return res.json({ ok: true, contractor: copy });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// -----------------------------
// POST /api/lead  -> Save lead to Supabase or local fallback, then notify via Telegram
// -----------------------------
app.post("/api/lead", async (req, res) => {
  try {
    const { name, phone, email, service, message, contractorId, source } = req.body;
    if (!name || !phone || !service) return res.status(400).json({ ok: false, error: "name, phone and service are required" });

    const leadRow = {
      name,
      phone,
      email: email || null,
      service,
      message: message || null,
      contractor_id: contractorId || null,
      source: source || "web",
      created_at: new Date().toISOString()
    };

    let saved = null;
    if (supabase) {
      const { data, error } = await supabase.from("leads").insert([leadRow]).select().maybeSingle();
      if (error) console.warn("Supabase lead save error:", error.message);
      else saved = data;
    } else {
      const arr = await readLocal("leads.json", []);
      arr.unshift(leadRow);
      await writeLocal("leads.json", arr);
      saved = leadRow;
    }

    // Notify via Telegram
    (async () => {
      try {
        let chatTarget = TELEGRAM_CHAT_ID_ADMIN;
        if (contractorId && supabase) {
          const { data: c } = await supabase.from("contractors").select("telegram_chat_id,company").eq("id", contractorId).maybeSingle();
          if (c && c.telegram_chat_id) chatTarget = c.telegram_chat_id;
        } else if (contractorId) {
          // local fallback: try local contractors file
          const local = await readLocal("contractors.json", { contractors: [] });
          const cc = (local.contractors || []).find(x => x.id === contractorId);
          if (cc && cc.telegram_chat_id) chatTarget = cc.telegram_chat_id;
        }
        if (TELEGRAM_BOT_TOKEN && chatTarget) {
          const msg = `📩 *New Lead*\n*Name:* ${name}\n*Phone:* ${phone}\n*Service:* ${service}\n*Message:* ${message || "-"}\n*Source:* ${source || "web"}`;
          const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatTarget, text: msg, parse_mode: "Markdown" })
          });
        }
      } catch (err) {
        console.warn("Telegram notify failed:", err.message || err);
      }
    })();

    return res.json({ ok: true, lead: saved });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// -----------------------------
// GET /api/leads -> list leads (admin)
app.get("/api/leads", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, leads: data });
    } else {
      const arr = await readLocal("leads.json", []);
      return res.json({ ok: true, leads: arr });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// -----------------------------
// Messages table for contractor<-admin messaging (simple)
app.post("/api/message", async (req, res) => {
  try {
    const { contractorId, sender, message } = req.body;
    if (!sender || !message) return res.status(400).json({ ok: false, error: "sender and message required" });
    const row = { contractor_id: contractorId || null, sender, message, created_at: new Date().toISOString() };
    if (supabase) {
      const { data, error } = await supabase.from("messages").insert([row]).select().maybeSingle();
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, message: data });
    } else {
      const arr = await readLocal("messages.json", []);
      arr.unshift(row);
      await writeLocal("messages.json", arr);
      return res.json({ ok: true, message: row });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/messages", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, messages: data });
    } else {
      const arr = await readLocal("messages.json", []);
      return res.json({ ok: true, messages: arr });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// -----------------------------
// Basic contractor profile endpoint (public)
// GET /c/:id -> returns contractor data
app.get("/api/contractor/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (supabase) {
      const { data, error } = await supabase.from("contractors").select("*").eq("id", id).maybeSingle();
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, contractor: data });
    } else {
      const j = await readLocal("contractors.json", { contractors: [] });
      const c = (j.contractors || []).find(x => String(x.id) === String(id));
      return res.json({ ok: true, contractor: c || null });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// -----------------------------
// ADMIN: Add new contractor (full profile version)
// From admin-add-contractor.html
// -----------------------------
app.post("/api/admin/add-contractor", async (req, res) => {
  try {
    const { company, name, service, rating, telegram_chat_id, logo } = req.body;

    if (!company || !name || !service)
      return res.status(400).json({ ok: false, error: "company, name and service required" });

    const contractor = {
      id: "c_" + Date.now(),
      company,
      name,
      service,
      rating: Number(rating) || 5,
      telegram_chat_id: telegram_chat_id || null,
      logo: logo || null,
      created_at: new Date().toISOString()
    };

    // Save via Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from("contractors")
        .insert([contractor])
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, contractor: data });
    }

    // Fallback: local JSON
    const j = await readLocal("contractors.json", { contractors: [] });
    j.contractors = j.contractors || [];
    j.contractors.push(contractor);
    await writeLocal("contractors.json", j);

    return res.json({ ok: true, contractor });
  } catch (err) {
    console.error("create contractor error", err);
    return res.status(500).json({ ok: false, error: err.toString() });
  }
});

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, () => {
  console.log(`Main site API running on port ${PORT}`);
});

