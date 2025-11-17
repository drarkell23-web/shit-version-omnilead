// server.js — OmniLead API Server (full file)
// Node >= 18+, run with: node server.js
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
app.use(express.json({ limit: "5mb" }));
app.use(fileUpload({ limits: { fileSize: 10 * 1024 * 1024 } })); // 10MB

// --------------------------
// Environment variables (required)
// --------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY; // service_role key (server only)
const ADMIN_PORTAL_KEY = process.env.ADMIN_PORTAL_KEY || "NO_ADMIN_KEY_SET";
const PORT = process.env.PORT || 3000;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("❌ Missing Supabase environment variables!");
  console.error("SUPABASE_URL =", SUPABASE_URL);
  console.error("SUPABASE_SERVICE_KEY =", SERVICE_ROLE ? "SET" : "MISSING");
  process.exit(1);
}

// Connect Supabase with service role (server-only)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false }
});

// Serve static frontend files from project folders
app.use(express.static("public"));
app.use(express.static("./"));
app.use("/assets", express.static(path.join(process.cwd(), "assets")));

// --------------------------
// Helper: json response
// --------------------------
const jsonHeaders = { "Content-Type": "application/json" };
function sendJson(res, payload, status = 200) {
  return res.status(status).set(jsonHeaders).send(JSON.stringify(payload));
}

// --------------------------
// Admin page loader (inject key into admin-create-contractor.html)
// --------------------------
app.get("/admin-create-contractor.html", (req, res) => {
  try {
    const htmlPath = path.join(process.cwd(), "admin-create-contractor.html");
    if (!fs.existsSync(htmlPath)) return res.status(404).send("Not found");
    const html = fs.readFileSync(htmlPath, "utf8");
    const injected = html.replace("{{ADMIN_PORTAL_KEY}}", ADMIN_PORTAL_KEY);
    res.setHeader("Content-Type", "text/html");
    res.send(injected);
  } catch (err) {
    console.error(err);
    res.status(500).send("Admin page error.");
  }
});

// --------------------------
// API: services (GET list)
// --------------------------
app.get("/api/services", async (req, res) => {
  try {
    const { data, error } = await supabase.from("services").select("*").order("name", { ascending: true }).limit(2000);
    if (error) return sendJson(res, { ok: false, error: error.message }, 400);
    return sendJson(res, { ok: true, services: data }, 200);
  } catch (err) {
    console.error(err);
    return sendJson(res, { ok: false, error: String(err) }, 500);
  }
});

// --------------------------
// API: contractors (GET list)
// --------------------------
app.get("/api/contractors", async (req, res) => {
  try {
    const { data, error } = await supabase.from("contractors").select("*").order("created_at", { ascending: false }).limit(2000);
    if (error) return sendJson(res, { ok: false, error: error.message }, 400);
    return sendJson(res, { ok: true, contractors: data }, 200);
  } catch (err) {
    console.error(err);
    return sendJson(res, { ok: false, error: String(err) }, 500);
  }
});

// --------------------------
// API: single contractor (GET by id) and POST upsert (optional)
// --------------------------
app.get("/api/contractor", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return sendJson(res, { ok: false, error: "missing id" }, 400);
    const { data, error } = await supabase.from("contractors").select("*").eq("id", id).maybeSingle();
    if (error) return sendJson(res, { ok: false, error: error.message }, 400);
    return sendJson(res, { ok: true, contractor: data }, 200);
  } catch (err) {
    console.error(err);
    return sendJson(res, { ok: false, error: String(err) }, 500);
  }
});

app.post("/api/contractor", async (req, res) => {
  try {
    const body = req.body || {};
    // Basic upsert params
    const payload = {
      id: body.id || undefined,
      auth_id: body.auth_id || undefined,
      company: body.company || body.name || null,
      phone: body.phone || null,
      password_hash: body.password_hash || body.password ? await bcrypt.hash(body.password, 10) : null,
      telegram_chat_id: body.telegram_chat_id || body.telegram || null,
      logo_url: body.logo_url || null,
      subscription_plan: body.subscription_plan || "free",
      main_service: body.main_service || null,
      updated_at: new Date().toISOString()
    };

    if (!payload.company || !payload.phone) {
      return sendJson(res, { ok: false, error: "company and phone are required" }, 400);
    }

    const onConflict = payload.auth_id ? ["auth_id"] : ["id"];
    const insertObj = { ...payload };
    if (!payload.id) delete insertObj.id;

    const { data, error } = await supabase.from("contractors").upsert(insertObj, { onConflict }).select().maybeSingle();
    if (error) return sendJson(res, { ok: false, error: error.message }, 400);
    return sendJson(res, { ok: true, contractor: data }, 200);
  } catch (err) {
    console.error(err);
    return sendJson(res, { ok: false, error: String(err) }, 500);
  }
});

// --------------------------
// API: create contractor (admin route — used by admin page)
// This endpoint creates a contractor profile (and optionally a Supabase Auth user if you wire it).
// For simplicity it inserts into contractors table and stores password_hash.
// --------------------------
app.post("/api/admin/create-contractor", async (req, res) => {
  try {
    // Basic server-side protection: require ADMIN_PORTAL_KEY header or request body key
    const provided = req.headers["x-admin-key"] || req.body.admin_key || req.query.key;
    if (!provided || provided !== ADMIN_PORTAL_KEY) {
      return sendJson(res, { ok: false, error: "unauthorized" }, 401);
    }

    const { company, phone, password, telegram, email } = req.body || {};
    if (!company || !phone || !password) return sendJson(res, { ok: false, error: "company, phone and password required" }, 400);

    const password_hash = await bcrypt.hash(password, 10);

    const insertObj = {
      company,
      phone,
      email: email || null,
      password_hash,
      telegram_chat_id: telegram || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from("contractors").insert([insertObj]).select().maybeSingle();
    if (error) return sendJson(res, { ok: false, error: error.message }, 400);

    return sendJson(res, { ok: true, contractor: data }, 201);
  } catch (err) {
    console.error(err);
    return sendJson(res, { ok: false, error: String(err) }, 500);
  }
});

// --------------------------
// API: contractor login (phone + password) — server verifies password_hash
// --------------------------
app.post("/api/contractor/login", async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) return sendJson(res, { ok: false, error: "phone and password required" }, 400);

    const { data: contractor, error } = await supabase.from("contractors").select("*").eq("phone", phone).maybeSingle();
    if (error) return sendJson(res, { ok: false, error: error.message }, 400);
    if (!contractor) return sendJson(res, { ok: false, error: "contractor not found" }, 404);

    const ok = await bcrypt.compare(password, contractor.password_hash || "");
    if (!ok) return sendJson(res, { ok: false, error: "invalid password" }, 401);

    // Return contractor info (omit password_hash)
    delete contractor.password_hash;
    return sendJson(res, { ok: true, contractor }, 200);
  } catch (err) {
    console.error(err);
    return sendJson(res, { ok: false, error: String(err) }, 500);
  }
});

// --------------------------
// API: leads (POST create, optionally GET list)
// --------------------------
app.post("/api/lead", async (req, res) => {
  try {
    const { name, phone, email, service, message, contractor_id } = req.body || {};
    if (!name || !phone || !service) return sendJson(res, { ok: false, error: "name, phone and service are required" }, 400);

    const insertObj = {
      name,
      phone,
      email: email || null,
      service,
      message: message || null,
      contractor_id: contractor_id || null,
      source: req.body.source || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from("leads").insert([insertObj]).select().maybeSingle();
    if (error) return sendJson(res, { ok: false, error: error.message }, 400);

    // Optionally: push notification or send telegram message here if contractor has telegram_chat_id (not implemented)
    return sendJson(res, { ok: true, lead: data }, 201);
  } catch (err) {
    console.error(err);
    return sendJson(res, { ok: false, error: String(err) }, 500);
  }
});

app.get("/api/leads", async (req, res) => {
  try {
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) return sendJson(res, { ok: false, error: error.message }, 400);
    return sendJson(res, { ok: true, leads: data }, 200);
  } catch (err) {
    console.error(err);
    return sendJson(res, { ok: false, error: String(err) }, 500);
  }
});

// --------------------------
// API: reviews (supports file upload in multipart form-data)
// POST: fields -> contractor_id, name, rating, comment, files -> images...
// --------------------------
app.post("/api/review", async (req, res) => {
  try {
    const contractorId = req.body.contractor_id || req.body.contractor || null;
    const reviewer_name = req.body.name || req.body.reviewer_name || "Customer";
    const rating = Number(req.body.rating || 5);
    const comment = req.body.comment || req.body.review || "";

    const images = [];

    // If files were uploaded (express-fileupload), upload to Supabase Storage bucket "contractor-assets"
    if (req.files) {
      const files = Array.isArray(req.files.files) ? req.files.files : Object.values(req.files);
      for (const file of files) {
        // generate safe path
        const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        const filePath = `reviews/${filename}`;

        const { error: uploadErr } = await supabase.storage
          .from("contractor-assets")
          .upload(filePath, file.data, {
            upsert: true,
            contentType: file.mimetype
          });

        if (!uploadErr) {
          const url = supabase.storage.from("contractor-assets").getPublicUrl(filePath).data.publicUrl;
          images.push(url);
        }
      }
    }

    const payload = {
      contractor_id: contractorId,
      reviewer_name,
      rating,
      comment,
      images,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from("reviews").insert([payload]).select().maybeSingle();
    if (error) return sendJson(res, { ok: false, error: error.message }, 400);

    return sendJson(res, { ok: true, review: data }, 201);
  } catch (err) {
    console.error(err);
    return sendJson(res, { ok: false, error: String(err) }, 500);
  }
});

app.get("/api/reviews", async (req, res) => {
  try {
    const { data, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) return sendJson(res, { ok: false, error: error.message }, 400);
    return sendJson(res, { ok: true, reviews: data }, 200);
  } catch (err) {
    console.error(err);
    return sendJson(res, { ok: false, error: String(err) }, 500);
  }
});

// --------------------------
// API: messages (contractor -> admin messages)
// --------------------------
app.post("/api/message", async (req, res) => {
  try {
    const { contractorId, message } = req.body || {};
    if (!contractorId || !message) return sendJson(res, { ok: false, error: "contractorId and message required" }, 400);

    const { data, error } = await supabase.from("messages").insert([{
      contractor_id: contractorId,
      message,
      created_at: new Date().toISOString()
    }]).select().maybeSingle();

    if (error) return sendJson(res, { ok: false, error: error.message }, 400);
    return sendJson(res, { ok: true, message: data }, 201);
  } catch (err) {
    console.error(err);
    return sendJson(res, { ok: false, error: String(err) }, 500);
  }
});

// --------------------------
// Health check / index
// --------------------------
app.get("/", (req, res) => {
  res.send("OmniLead API: running");
});

// --------------------------
// Start server
// --------------------------
app.listen(PORT, () => {
  console.log(`OmniLead API running on port ${PORT}`);
});
