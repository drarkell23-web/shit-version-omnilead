/**
 * server.js — OmniSolutions (Supabase Edition)
 * Features:
 *  - Supabase DB for contractors, leads, reviews, messages, badges
 *  - Supabase Storage: logos + review images
 *  - Telegram notifications
 *  - JSON fallback for safety
 */

import express from "express";
import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import multer from "multer";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

// ---------- INIT ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 10000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Supabase client (server mode)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---------- DIRECTORIES ----------
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// JSON helpers
function readJSON(name) {
  const file = path.join(DATA_DIR, name + ".json");
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file)); } 
  catch { return []; }
}
function writeJSON(name, data) {
  const file = path.join(DATA_DIR, name + ".json");
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- MULTER (temporary local upload before Supabase upload) ----------
const upload = multer({ storage: multer.memoryStorage() });

// ---------- EXPRESS ----------
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

/* =============================================================
   TELEGRAM SEND
============================================================= */
async function sendTelegram(chatId, text) {
  if (!BOT_TOKEN || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML"
      })
    });
  } catch (err) {
    console.log("Telegram send error", err);
  }
}

/* =============================================================
   SUPABASE UPLOAD HELPERS
============================================================= */
async function uploadToBucket(bucket, fileBuffer, fileName, mime) {
  const filePath = `${Date.now()}_${fileName.replace(/\s+/g, "_")}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBuffer, { contentType: mime });

  if (error) {
    console.log("Supabase upload error", error);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/* =============================================================
   SERVICES (READ-ONLY)
============================================================= */
app.get("/api/services", async (req, res) => {
  const { data, error } = await supabase.from("services").select("*");

  if (error || !data) {
    return res.json({ services: readJSON("services") });
  }

  return res.json({ services: data });
});

/* =============================================================
   CONTRACTORS — CREATE / UPDATE
============================================================= */
app.post("/api/contractor", async (req, res) => {
  const payload = req.body;

  // Upsert contractor in Supabase
  const { error } = await supabase
    .from("contractors")
    .upsert([{ ...payload, updated_at: new Date() }]);

  if (error) {
    console.log("Supabase contractor error", error);
    return res.json({ ok: false });
  }

  // JSON fallback
  let file = readJSON("contractors");
  file.unshift(payload);
  writeJSON("contractors", file);

  return res.json({ ok: true });
});

/* =============================================================
   GET CONTRACTORS
============================================================= */
app.get("/api/contractors", async (req, res) => {
  const { data, error } = await supabase.from("contractors").select("*");

  if (error || !data) return res.json({ contractors: readJSON("contractors") });

  return res.json({ contractors: data });
});

/* =============================================================
   LEAD — SAVE + SEND TELEGRAM
============================================================= */
app.post("/api/lead", async (req, res) => {
  const { name, phone, email, service, message, contractor_id } = req.body;

  // Save to Supabase
  await supabase.from("leads").insert([
    { customer_name: name, phone, email, service, message, contractor_id }
  ]);

  // JSON fallback
  const arr = readJSON("leads");
  arr.unshift(req.body);
  writeJSON("leads", arr);

  // Telegram Text
  const text = `
<b>📩 New Lead</b>
👤 ${name}
📞 ${phone}
🛠 Service: ${service}
💬 ${message}
⏱ ${new Date().toLocaleString()}
  `;

  await sendTelegram(ADMIN_CHAT_ID, text);

  return res.json({ ok: true });
});

/* =============================================================
   UPLOAD REVIEW (IMAGES → SUPABASE STORAGE)
============================================================= */
app.post("/api/review", upload.array("images", 10), async (req, res) => {
  const { contractor_id, name, rating, comment } = req.body;

  let imageUrls = [];

  for (const f of req.files) {
    const url = await uploadToBucket("reviews", f.buffer, f.originalname, f.mimetype);
    if (url) imageUrls.push(url);
  }

  // Save to Supabase
  await supabase.from("reviews").insert([
    {
      contractor_id,
      reviewer_name: name,
      rating: Number(rating),
      comment,
      images: imageUrls
    }
  ]);

  return res.json({ ok: true, images: imageUrls });
});

/* =============================================================
   APPLY BADGE (ADMIN)
============================================================= */
app.post("/api/apply-badge", async (req, res) => {
  const { adminSecret, contractor_id, badge } = req.body;

  if (adminSecret !== ADMIN_SECRET) {
    return res.status(403).json({ ok: false });
  }

  await supabase
    .from("contractors")
    .update({ badge })
    .eq("id", contractor_id);

  await supabase
    .from("badges")
    .insert([{ contractor_id, badge_type: badge }]);

  return res.json({ ok: true });
});

/* =============================================================
   PUBLIC CONTRACTOR PAGE DATA
============================================================= */
app.get("/api/contractor/:id", async (req, res) => {
  const id = req.params.id;

  const { data: contractor } = await supabase
    .from("contractors")
    .select("*")
    .eq("id", id)
    .single();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("contractor_id", id);

  return res.json({ contractor, reviews });
});

/* =============================================================
   ADMIN VIEW LOGS
============================================================= */
app.get("/api/logs/:name", (req, res) => {
  return res.json(readJSON(req.params.name));
});

/* =============================================================
   STATIC FALLBACK
============================================================= */
app.use((req, res) => {
  res.status(404).send("Not Found");
});

/* =============================================================
   START SERVER
============================================================= */
app.listen(PORT, () =>
  console.log(`🚀 OmniSolutions Server running on port ${PORT}`)
);
