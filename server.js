/**
 * server.js - Restored & upgraded main server
 * - JSON persistence in /data for contractors, services, leads, reviews, messages
 * - File uploads saved to /uploads
 * - Endpoints:
 *   GET /api/services
 *   GET /api/contractors
 *   POST /api/contractor
 *   POST /api/lead
 *   POST /api/review (multipart)
 *   POST /api/message
 *   POST /api/apply-badge (adminSecret required)
 *   GET /api/logs/:name
 *
 * Set env variables: BOT_TOKEN, ADMIN_CHAT_ID, ADMIN_SECRET
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

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const ASSETS_DIR = path.join(__dirname, "assets");
const BADGES_DIR = path.join(__dirname, "badges");

// ensure directories
for (const d of [DATA_DIR, UPLOADS_DIR, ASSETS_DIR, BADGES_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function readJSON(name) {
  const f = path.join(DATA_DIR, name + ".json");
  if (!fs.existsSync(f)) return [];
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch(e){ console.error("readJSON", e); return []; }
}
function writeJSON(name, data) {
  const f = path.join(DATA_DIR, name + ".json");
  fs.writeFileSync(f, JSON.stringify(data, null, 2));
}
function appendLog(name, obj) {
  const arr = readJSON(name);
  arr.unshift({ ts: new Date().toISOString(), ...obj });
  writeJSON(name, arr.slice(0, 5000));
}

// multer upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (req,file,cb) => cb(null, UPLOADS_DIR),
    filename: (req,file,cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.originalname.replace(/\s+/g,'_')}`)
  }),
  limits: { fileSize: 12 * 1024 * 1024 }
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
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ chat_id: String(chatId), text, parse_mode: "HTML" })
    });
    return await res.json();
  } catch (err) {
    console.error("sendTelegram error", err);
    return { ok:false, error: String(err) };
  }
}

/* Ensure services list exists (human friendly, >200) */
function ensureServices() {
  const p = path.join(DATA_DIR, "services.json");
  if (fs.existsSync(p)) return;
  const templates = {
    "Property & Maintenance": ["Roof Repair","Gutter Cleaning","Plumbing Repair","Drain Unblock","Tiling","Interior Painting","Exterior Painting","Plastering","Carpentry","Window Repair","Fence Repair","Concrete Repair","Leak Detection","Damp Proofing","Locksmith"],
    "Cleaning & Hygiene": ["House Cleaning - Standard","House Cleaning - Deep","Office Cleaning","End of Lease Clean","Carpet Steam Clean","Curtain Cleaning","Window Cleaning","Sanitization & Disinfection","Tile & Grout Clean","Upholstery Cleaning"],
    "Security & Energy": ["CCTV Installation","CCTV Maintenance","Alarm System Installation","Electric Fence Installation","Gate Motor","Access Control","Intercom Install","Battery Backup","Energy Audit"],
    "Outdoor & Garden": ["Lawn Mowing","Garden Maintenance","Tree Pruning","Tree Felling","Hedge Trimming","Irrigation Install","Landscape Design","Paving & Patio"],
    "Appliances & Repairs": ["Fridge Repair","Washing Machine Repair","Dryer Repair","Oven Repair","Dishwasher Repair","Microwave Repair"],
    "Electrical": ["Light Fitting Install","Switch & Socket Repair","Full Rewire","Partial Rewire","Electrical Inspection","Ceiling Fan Install"],
    "Plumbing": ["Toilet Install/Replace","Hot Water Repair","Hot Water Replace","Burst Pipe Repair","Tap Replacement","Bathroom Fitting"],
    "Handyman": ["Flat Pack Assembly","Shelving Install","Picture Hanger Install","Odd Jobs"],
    "Renovation": ["Kitchen Renovation","Bathroom Renovation","Flooring Install","Structural Repair","Tiling"]
  };
  const services = [];
  let id = 1;
  for (const [cat, arr] of Object.entries(templates)) {
    arr.forEach(n => services.push({ id: `s-${id++}`, cat, name: n }));
  }
  while (services.length < 220) {
    const cats = Object.keys(templates);
    const c = cats[Math.floor(Math.random()*cats.length)];
    services.push({ id: `s-${id++}`, cat: c, name: `${c.split(" ")[0]} Specialist ${id}` });
  }
  writeJSON("services", services);
}
ensureServices();

/* API: GET /api/services */
app.get("/api/services", (req,res) => {
  const services = readJSON("services");
  const cat = req.query.cat;
  if (cat) return res.json({ ok:true, services: services.filter(s => s.cat === cat) });
  res.json({ ok:true, services });
});

/* API: GET /api/contractors */
app.get("/api/contractors", (req,res) => {
  const contractors = readJSON("contractors");
  res.json({ ok:true, contractors });
});

/* API: POST /api/contractor - create/update contractor */
app.post("/api/contractor", (req,res) => {
  try {
    const c = req.body;
    const contractors = readJSON("contractors");
    const idx = contractors.findIndex(x => (c.id && x.id === c.id) || (c.phone && x.phone === c.phone));
    if (idx > -1) {
      contractors[idx] = { ...contractors[idx], ...c, updated: new Date().toISOString() };
    } else {
      const id = c.id || `ct-${Date.now()}`;
      contractors.unshift({ id, ...c, created: new Date().toISOString() });
    }
    writeJSON("contractors", contractors);
    appendLog("contractors", { action: "upsert", contractor: c });
    return res.json({ ok:true });
  } catch (err) {
    console.error("contractor upsert", err);
    return res.status(500).json({ ok:false, error: String(err) });
  }
});

/* API: POST /api/lead - save lead, notify admin & contractor */
app.post("/api/lead", async (req,res) => {
  try {
    const { name, phone, email, service, message, contractorId } = req.body;
    appendLog("leads", { name, phone, email, service, message, contractorId });
    const text = [
      "<b>📩 New Lead</b>",
      `👤 ${name || "-"}`,
      `📞 ${phone || "-"}`,
      service ? `🛠 ${service}` : "",
      message ? `💬 ${message.length>300 ? message.slice(0,300)+"..." : message}` : "",
      email ? `📧 ${email}` : "",
      `⏱ ${new Date().toLocaleString()}`
    ].filter(Boolean).join("\n");

    if (BOT_TOKEN && ADMIN_CHAT_ID) {
      await sendTelegram(BOT_TOKEN, ADMIN_CHAT_ID, text);
    }

    if (contractorId) {
      const contractors = readJSON("contractors");
      const c = contractors.find(x => x.id === contractorId || x.phone === contractorId);
      if (c && c.telegramToken && c.telegramChatId) {
        await sendTelegram(c.telegramToken, c.telegramChatId, text);
      }
    }
    res.json({ ok:true });
  } catch (err) {
    console.error("lead err", err);
    res.status(500).json({ ok:false, error: String(err) });
  }
});

/* POST /api/review with images */
app.post("/api/review", upload.array("images", 8), (req,res) => {
  try {
    const { contractor, name, rating, comment } = req.body;
    const images = (req.files || []).map(f => `/uploads/${path.basename(f.path)}`);
    appendLog("reviews", { contractor, name, rating: Number(rating||0), comment, images });
    const reviews = readJSON("reviews");
    reviews.unshift({ contractor, name, rating: Number(rating||0), comment, images, ts: new Date().toISOString() });
    writeJSON("reviews", reviews);
    res.json({ ok:true, images });
  } catch (err) {
    console.error("review err", err);
    res.status(500).json({ ok:false, error: String(err) });
  }
});

/* POST /api/message contractor->admin */
app.post("/api/message", (req,res) => {
  try {
    const { contractorId, message } = req.body;
    appendLog("messages", { contractorId, message });
    if (BOT_TOKEN && ADMIN_CHAT_ID) {
      sendTelegram(BOT_TOKEN, ADMIN_CHAT_ID, `<b>Message from Contractor</b>\nID: ${contractorId}\n${message}`);
    }
    res.json({ ok:true });
  } catch (err) {
    console.error("message err", err);
    res.status(500).json({ ok:false, error: String(err) });
  }
});

/* POST /api/apply-badge - admin action */
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
    res.json({ ok:true, contractor: contractors[idx] });
  } catch (err) {
    console.error("apply-badge", err);
    res.status(500).json({ ok:false, error: String(err) });
  }
});

/* GET logs for admin or debugging */
app.get("/api/logs/:name", (req,res) => {
  const arr = readJSON(req.params.name);
  res.json(arr);
});

/* helper admin secret check (for UI) */
app.get("/api/admin-secret", (req,res) => {
  res.json({ ok:true, secret: !!ADMIN_SECRET });
});

// static fallback
app.use((req,res)=>{
  const file = path.join(__dirname, req.path);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return res.sendFile(file);
  res.status(404).send("Not found");
});

app.listen(PORT, ()=>console.log(`🚀 Server running on port ${PORT}`));
