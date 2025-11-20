// server.js — lightweight API used by the main site
import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// env
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID_ADMIN = process.env.TELEGRAM_CHAT_ID_ADMIN;

// supabase client only if we have service key
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log("Supabase: service client enabled");
} else {
  console.log("Supabase: service client NOT configured (falling back to local storage).");
}

// static frontend
app.use(express.static("public"));
app.use(express.static("."));

// serve demo data (services, contractors, reviews) under /data
app.get("/data/services.json", async (req, res) => {
  const file = path.join(process.cwd(), "data", "services.json");
  if (await fs.pathExists(file)) return res.sendFile(file);
  return res.json({ services: [] });
});
app.get("/data/contractors.json", async (req, res) => {
  const file = path.join(process.cwd(), "data", "contractors.json");
  if (await fs.pathExists(file)) return res.sendFile(file);
  return res.json({ contractors: [] });
});
app.get("/data/reviews.json", async (req, res) => {
  const file = path.join(process.cwd(), "data", "reviews.json");
  if (await fs.pathExists(file)) return res.sendFile(file);
  return res.json({ reviews: [] });
});

// GET contractors (tries Supabase, else local file)
app.get("/api/contractors", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from("contractors").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, contractors: data });
    } else {
      const file = path.join(process.cwd(), "data", "contractors.json");
      const j = await fs.readJson(file).catch(()=>({ contractors: [] }));
      return res.json({ ok: true, contractors: j.contractors || [] });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET services (fallback to static already handled by /data/services.json)
// Also provide a convenient API proxy
app.get("/api/services", async (req, res) => {
  const file = path.join(process.cwd(), "data", "services.json");
  const j = await fs.readJson(file).catch(()=>({ services: [] }));
  return res.json(j);
});

// POST /api/lead -> attempt to save to Supabase (if configured) and forward to Telegram
app.post("/api/lead", async (req, res) => {
  try {
    const { name, phone, email, service, message, contractorId, source } = req.body;
    if (!name || !phone || !service) return res.json({ ok: false, error: "name, phone and service are required" });

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

    // 1) Save
    let saved = null;
    if (supabase) {
      const { data, error } = await supabase.from("leads").insert([leadRow]).select().maybeSingle();
      if (error) console.warn("Supabase lead save error:", error.message);
      else saved = data;
    } else {
      // fallback: append to local JSON
      const file = path.join(process.cwd(), "data", "leads.json");
      await fs.ensureFile(file);
      const arr = (await fs.readJson(file).catch(()=>[]));
      arr.unshift(leadRow);
      await fs.writeJson(file, arr, { spaces: 2 });
      saved = leadRow;
    }

    // 2) Telegram notify (admin or contractor)
    try {
      let chatTarget = TELEGRAM_CHAT_ID_ADMIN;
      // If contractor ID provided and supabase available try to fetch contractor.telegram_chat_id
      if (contractorId && supabase) {
        const { data: c } = await supabase.from("contractors").select("telegram_chat_id,company").eq("id", contractorId).maybeSingle();
        if (c && c.telegram_chat_id) chatTarget = c.telegram_chat_id;
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
    } catch (tErr) {
      console.warn("Telegram notify failed:", tErr.message);
    }

    return res.json({ ok: true, lead: saved });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// fallback
app.use((req,res)=>res.status(404).send("Not found"));

app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
