// server.js — OmniLead API Server (admin + contractor login + contractor upsert + simple messages)
import express from "express";
import fileUpload from "express-fileupload";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_PORTAL_KEY = process.env.ADMIN_PORTAL_KEY || "";
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// serve static
app.use(express.static("public"));
app.use(express.static("./"));

// --- admin page injector (optional)
app.get("/admin-create-contractor.html", (req, res) => {
  try {
    const html = fs.readFileSync("admin-create-contractor.html", "utf8");
    const injected = html.replace("{{ADMIN_PORTAL_KEY}}", ADMIN_PORTAL_KEY || "NO_ADMIN_KEY_SET");
    res.send(injected);
  } catch (err) {
    res.status(500).send("Admin page missing.");
  }
});

// -------------------------
// Admin: create contractor
// -------------------------
// Body: { company, phone, password, telegram, key }
// key must match ADMIN_PORTAL_KEY (or x-admin-key header)
app.post("/api/admin/create-contractor", async (req, res) => {
  try {
    const { company, phone, password, telegram, key } = req.body;
    const headerKey = req.headers["x-admin-key"];
    const provided = key || headerKey;
    if (provided !== ADMIN_PORTAL_KEY) return res.status(403).json({ ok: false, error: "Invalid admin key" });
    if (!company || !phone || !password) return res.json({ ok: false, error: "company/phone/password required" });

    const password_hash = await bcrypt.hash(password, 10);
    const payload = {
      company,
      phone,
      password_hash,
      telegram_chat_id: telegram || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from("contractors").insert([payload]).select().maybeSingle();
    if (error) return res.json({ ok: false, error: error.message });
    res.json({ ok: true, contractor: data });
  } catch (err) {
    res.json({ ok: false, error: String(err) });
  }
});

// -------------------------
// Contractor login (phone + password)
// // POST /api/contractor/login { phone, password }
// -------------------------
app.post("/api/contractor/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.json({ ok: false, error: "phone/password required" });

    const { data: contractor, error } = await supabase
      .from("contractors")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (error) return res.json({ ok: false, error: error.message });
    if (!contractor) return res.json({ ok: false, error: "Contractor not found" });

    const ok = await bcrypt.compare(password, contractor.password_hash || "");
    if (!ok) return res.json({ ok: false, error: "Invalid password" });

    // successful — return contractor row (no session handling here)
    return res.json({ ok: true, contractor });
  } catch (err) {
    res.json({ ok: false, error: String(err) });
  }
});

// -------------------------
// Contractor upsert (server-side)
// POST /api/contractor  -> body contains contractor fields (id or auth_id allowed)
// -------------------------
app.post("/api/contractor", async (req, res) => {
  try {
    const body = req.body || {};
    const insertObj = {
      id: body.id || undefined,
      auth_id: body.auth_id || undefined,
      company: body.company || body.name || null,
      phone: body.phone || null,
      password_hash: body.password_hash || null,
      telegram_chat_id: body.telegram_chat_id || body.telegram || null,
      logo_url: body.logo_url || null,
      service: body.service || body.main_service || null,
      updated_at: new Date().toISOString()
    };

    // basic validation: require id|auth_id or (company & phone)
    if (!insertObj.id && !insertObj.auth_id && (!insertObj.company || !insertObj.phone)) {
      return res.json({ ok: false, error: "id/auth_id or (company & phone) required" });
    }

    const onConflict = insertObj.auth_id ? ["auth_id"] : ["id"];
    if (!insertObj.id) delete insertObj.id;

    const { data, error } = await supabase.from("contractors").upsert(insertObj, { onConflict }).select().maybeSingle();
    if (error) return res.json({ ok: false, error: error.message });
    res.json({ ok: true, contractor: data });
  } catch (err) {
    res.json({ ok: false, error: String(err) });
  }
});

// -------------------------
// GET contractor by id
// GET /api/contractor?id=<id>
// -------------------------
app.get("/api/contractor", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.json({ ok: false, error: "missing id" });
    const { data, error } = await supabase.from("contractors").select("*").eq("id", id).maybeSingle();
    if (error) return res.json({ ok: false, error: error.message });
    res.json({ ok: true, contractor: data });
  } catch (err) {
    res.json({ ok: false, error: String(err) });
  }
});

// -------------------------
// Messages for contractor (admin side or contractor fetching their messages)
// GET /api/messages?contractorId=<id>
// POST /api/messages { contractorId, message }
// -------------------------
app.get("/api/messages", async (req, res) => {
  try {
    const contractorId = req.query.contractorId;
    if (!contractorId) return res.json({ ok: false, error: "missing contractorId" });
    const { data, error } = await supabase.from("messages").select("*").eq("contractor_id", contractorId).order("created_at", { ascending: false }).limit(200);
    if (error) return res.json({ ok: false, error: error.message });
    res.json({ ok: true, messages: data });
  } catch (err) {
    res.json({ ok: false, error: String(err) });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const { contractorId, message } = req.body;
    if (!contractorId || !message) return res.json({ ok: false, error: "contractorId and message required" });
    const { data, error } = await supabase.from("messages").insert([{ contractor_id: contractorId, message, created_at: new Date().toISOString() }]).select();
    if (error) return res.json({ ok: false, error: error.message });
    res.json({ ok: true, message: data });
  } catch (err) {
    res.json({ ok: false, error: String(err) });
  }
});

// catchall
app.get("*", (req, res) => {
  // let static middleware serve files; this is fallback
  res.sendFile(path.resolve("public/index.html"));
});

// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
