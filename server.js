/**
 * server.js — OmniLink Solutions
 * - Persistent JSON store for demo-to-production ease (data in /data/*.json)
 * - Endpoints for leads, contractors, reviews, services, applying badges, messages
 * - Sends Telegram messages to admin bot and contractor bot if configured
 *
 * IMPORTANT: Set these environment variables in your host (Render):
 * BOT_TOKEN, ADMIN_CHAT_ID, ADMIN_SECRET
 *
 * NOTE: For production durability across deploys use Firestore or an external DB.
 */

import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = process.env.BOT_TOKEN || "8526401033:AAFrG8IH8xqQL_RTD7s7JLyxZpc8e8GOyyg";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "8187670531";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "omni$admin_2025_KEY!@34265346597843152";

const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const ASSETS_DIR = path.join(__dirname, "assets");
const BADGES_DIR = path.join(__dirname, "badges");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR);
if (!fs.existsSync(BADGES_DIR)) fs.mkdirSync(BADGES_DIR);

// small helpers
function readJSON(name) {
  const file = path.join(DATA_DIR, name + ".json");
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch(e){ console.error("readJSON err", e); return []; }
}
function writeJSON(name, data) {
  const file = path.join(DATA_DIR, name + ".json");
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function appendLog(name, obj) {
  const arr = readJSON(name);
  arr.unshift({ ts: new Date().toISOString(), ...obj });
  writeJSON(name, arr.slice(0, 5000));
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req,file,cb) => cb(null, UPLOADS_DIR),
    filename: (req,file,cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.originalname.replace(/\s+/g,'_')}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const app = express();
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/assets", express.static(ASSETS_DIR));
app.use("/badges", express.static(BADGES_DIR));

async function sendTelegram(token, chatId, text) {
  if (!token || !chatId) return { ok:false, error: "missing token/chat" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: String(chatId), text, parse_mode: "HTML" })
    });
    return await res.json();
  } catch (err) {
    console.error("sendTelegram error", err);
    return { ok:false, error: String(err) };
  }
}

// Ensure services list exists (server generates clear names; no "Service 28" endings)
function ensureServices() {
  const p = path.join(DATA_DIR, "services.json");
  if (fs.existsSync(p)) return;
  const templates = {
    "Property & Maintenance": ["Roof Repair","Gutter Cleaning","Plumbing Repair","Drain Unblock","Tiling","Painting - Interior","Painting - Exterior","Plastering","Carpentry","Glazier - Window Repair","Fence Repair","Concrete Repair","Leak Detection","Damp Proofing","Locksmith","Roof Inspection","Chimney Repair"],
    "Cleaning & Hygiene": ["House Cleaning - Standard","House Cleaning - Deep","Office Cleaning","End of Lease Clean","Carpet Steam Clean","Curtain Cleaning","Window Cleaning","Sanitization & Disinfection","Tile & Grout Clean","Upholstery Cleaning"],
    "Security & Energy": ["CCTV Installation","CCTV Maintenance","Alarm System Installation","Electric Fence Installation","Gate Motor","Access Control","Intercom Install","Home Automation - Security","Alarm Repair"],
    "Outdoor & Garden": ["Lawn Mowing","Garden Maintenance","Tree Pruning","Tree Removal","Hedge Trimming","Irrigation System Install","Landscape Design","Paving & Patio Install","Fence & Gate Installation"],
    "Appliances & Repairs": ["Fridge Repair","Washing Machine Repair","Dryer Repair","Oven & Stove Repair","Dishwasher Repair","Microwave Repair","Appliance Installation","Appliance Safety Check"],
    "Electrical": ["Light Fitting Install","Switch & Socket Repair","Full Rewire - Small","Partial Rewire","Electrical Inspection","Ceiling Fan Install","Smoke Detector Install"],
    "Plumbing": ["Toilet Install/Replace","Hot Water System Repair","Hot Water System Replace","Gas Appliance Check","Water Heater Install","Tap Replacement","Bathroom Suite Install","Kitchen Plumbing"],
    "Handyman": ["Flat Pack Assembly","Shelving Install","Picture/Hanger Install","Door Adjustment","Lock Replacement","Odd Jobs"],
    "Renovation & Building": ["Kitchen Renovation","Bathroom Renovation","Home Extension Prep","Flooring Install","Plaster & Skim Coating","Minor Brickwork","Tiling - walls & floors","Structural Repair (inspect)"],
    "Automotive & On-Site": ["Mobile Mechanic - Basic","Battery Replacement (Mobile)","Tyre Change (mobile)","Vehicle Recovery","On-site Diagnostics","Car Detailing"],
    "Miscellaneous": ["IT & Networking - Setup","Furniture Moving","Pest Control","Waste Clearance","Holiday Home Checks"]
  };
  const services = [];
  let idIdx = 1;
  for (const [cat, arr] of Object.entries(templates)) {
    arr.forEach(name => services.push({ id: `s-${idIdx++}`, cat, name }));
  }
  // generate sensible extras to reach >200
  while (services.length < 220) {
    const cats = Object.keys(templates);
    const cat = cats[Math.floor(Math.random() * cats.length)];
    services.push({ id: `s-${idIdx++}`, cat, name: `${cat.split(' ')[0]} Specialist ${idIdx}` });
  }
  writeJSON("services", services);
}
ensureServices();

/* Endpoints */

// admin-secret check (visibility only)
app.get("/api/admin-secret", (req,res) => res.json({ ok:true, secret: !!ADMIN_SECRET }));

// GET services
app.get("/api/services", (req,res) => {
  const services = readJSON("services");
  const cat = req.query.cat;
  if (cat) return res.json({ ok:true, services: services.filter(s => s.cat === cat) });
  res.json({ ok:true, services });
});

// GET contractors
app.get("/api/contractors", (req,res) => {
  const contractors = readJSON("contractors");
  res.json({ ok:true, contractors });
});

// POST contractor upsert
app.post("/api/contractor", (req,res) => {
  try {
    const incoming = req.body;
    const contractors = readJSON("contractors");
    const matchIdx = contractors.findIndex(c => (incoming.id && c.id === incoming.id) || (incoming.phone && c.phone === incoming.phone));
    if (matchIdx > -1) {
      contractors[matchIdx] = { ...contractors[matchIdx], ...incoming, updated: new Date().toISOString() };
    } else {
      const id = incoming.id || `ct-${Date.now()}`;
      contractors.unshift({ id, ...incoming, created: new Date().toISOString() });
    }
    writeJSON("contractors", contractors);
    appendLog("contractors", { action: "upsert", contractor: incoming });
    return res.json({ ok:true });
  } catch (err) {
    console.error("contractor upsert err", err);
    return res.status(500).json({ ok:false, error: String(err) });
  }
});

// POST lead
app.post("/api/lead", async (req,res) => {
  try {
    const { name, phone, email, service, message, contractorId } = req.body;
    appendLog("leads", { name, phone, email, service, message, contractorId });
    const text = [
      "<b>📩 New Lead</b>",
      `👤 ${name || "-"}`,
      `📞 ${phone || "-"}`,
      service ? `🛠 ${service}` : "",
      message ? `💬 ${message.length>300 ? message.slice(0,300) + "..." : message}` : "",
      email ? `📧 ${email}` : "",
      `⏱ ${new Date().toLocaleString()}`
    ].filter(Boolean).join("\n");

    // notify admin
    if (BOT_TOKEN && ADMIN_CHAT_ID) {
      await sendTelegram(BOT_TOKEN, ADMIN_CHAT_ID, text);
    }

    // notify specific contractor if they have token/chat
    if (contractorId) {
      const contractors = readJSON("contractors");
      const c = contractors.find(x => x.id === contractorId || x.phone === contractorId || x.name === contractorId);
      if (c && c.telegramToken && c.telegramChatId) {
        await sendTelegram(c.telegramToken, c.telegramChatId, text);
      }
    }
    return res.json({ ok:true });
  } catch (err) {
    console.error("lead err", err);
    return res.status(500).json({ ok:false, error: String(err) });
  }
});

// POST review + file upload (stores images in uploads and persists review)
app.post("/api/review", upload.array("images", 8), (req,res) => {
  try {
    const { contractor, name, rating, comment } = req.body;
    const images = (req.files || []).map(f => `/uploads/${path.basename(f.path)}`);
    appendLog("reviews", { contractor, name, rating, comment, images });
    const reviews = readJSON("reviews");
    reviews.unshift({ contractor, name, rating: Number(rating || 0), comment, images, ts: new Date().toISOString() });
    writeJSON("reviews", reviews);
    return res.json({ ok:true, images });
  } catch (err) {
    console.error("review upload err", err);
    return res.status(500).json({ ok:false, error: String(err) });
  }
});

// POST message (contractor -> admin)
app.post("/api/message", (req,res) => {
  try {
    const { contractorId, message } = req.body;
    appendLog("messages", { contractorId, message });
    // send to admin chat if possible
    if (BOT_TOKEN && ADMIN_CHAT_ID) {
      sendTelegram(BOT_TOKEN, ADMIN_CHAT_ID, `<b>Message from Contractor</b>\nID: ${contractorId}\n${message}`);
    }
    return res.json({ ok:true });
  } catch (err) {
    console.error("message err", err);
    return res.status(500).json({ ok:false, error: String(err) });
  }
});

// POST apply badge (admin action, persisted)
app.post("/api/apply-badge", (req,res) => {
  try {
    const { adminSecret, contractorId, badge } = req.body;
    if (!adminSecret || adminSecret !== ADMIN_SECRET) return res.status(401).json({ ok:false, error: "unauthorized" });
    const contractors = readJSON("contractors");
    const idx = contractors.findIndex(c => c.id === contractorId || c.phone === contractorId);
    if (idx === -1) return res.status(404).json({ ok:false, error: "contractor not found" });
    contractors[idx].badge = badge;
    contractors[idx].badgeAssignedAt = new Date().toISOString();
    writeJSON("contractors", contractors);
    appendLog("contractors", { action: "apply-badge", contractorId, badge });
    return res.json({ ok:true, contractor: contractors[idx] });
  } catch (err) {
    console.error("apply-badge err", err);
    return res.status(500).json({ ok:false, error: String(err) });
  }
});

// GET logs for admin
app.get("/api/logs/:name", (req,res) => {
  const name = req.params.name;
  res.json(readJSON(name));
});

// fallback static serve for files
app.use((req,res) => {
  const file = path.join(__dirname, req.path);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return res.sendFile(file);
  res.status(404).send("Not found");
});

app.listen(PORT, () => console.log(`🚀 OmniLink Server live on port ${PORT}`));
