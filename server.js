// server.js — OmniLead API Server
import express from "express";
import fileUpload from "express-fileupload";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// --------------------------------------------
// ENV VARIABLES
// --------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_PORTAL_KEY = process.env.ADMIN_PORTAL_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("❌ Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// --------------------------------------------
// STATIC FILES
// --------------------------------------------
app.use(express.static("public"));
app.use(express.static("./"));

// --------------------------------------------
// ADMIN PAGE — Inject admin key
// --------------------------------------------
app.get("/admin-create-contractor.html", (req, res) => {
  try {
    const html = fs.readFileSync("admin-create-contractor.html", "utf8");
    res.send(html.replace("{{ADMIN_PORTAL_KEY}}", ADMIN_PORTAL_KEY || ""));
  } catch (err) {
    res.status(500).send("Admin page missing.");
  }
});

// ======================================================================
// GET SERVICES  ✔ NEEDED BY FRONTEND
// ======================================================================
app.get("/api/services", async (req, res) => {
  const { data, error } = await supabase.from("services").select("*");
  if (error) return res.json({ services: [] });
  res.json({ services: data });
});

// ======================================================================
// GET CONTRACTORS  ✔ NEEDED BY FRONTEND + CHATBOT
// ======================================================================
app.get("/api/contractors", async (req, res) => {
  const { data, error } = await supabase.from("contractors").select("*");
  if (error) return res.json({ contractors: [] });
  res.json({ contractors: data });
});

// ======================================================================
// GET REVIEWS  ✔ FIXED
// ======================================================================
app.get("/api/review", async (req, res) => {
  const { data, error } = await supabase.from("reviews").select("*");
  if (error) return res.json({ reviews: [] });
  res.json({ reviews: data });
});

// ======================================================================
// CREATE CONTRACTOR (ADMIN)
// ======================================================================
app.post("/api/admin/create-contractor", async (req, res) => {
  try {
    const { company, phone, password, telegram } = req.body;

    if (!company || !phone || !password)
      return res.json({ ok: false, error: "Missing fields" });

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase.from("contractors").insert([
      {
        company,
        phone,
        password_hash,
        telegram_chat_id: telegram || null,
        created_at: new Date().toISOString(),
      },
    ]).select();

    if (error) return res.json({ ok: false, error: error.message });

    res.json({ ok: true, contractor: data });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ======================================================================
// CONTRACTOR LOGIN
// ======================================================================
app.post("/api/contractor/login", async (req, res) => {
  const { phone, password } = req.body;

  const { data: contractor, error } = await supabase
    .from("contractors")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (!contractor) return res.json({ ok: false, error: "Invalid login" });

  const match = await bcrypt.compare(password, contractor.password_hash);
  if (!match) return res.json({ ok: false, error: "Wrong password" });

  return res.json({ ok: true, contractor });
});

// ======================================================================
// CREATE LEAD  ✔ USED BY CHATBOT + MAIN FORM
// ======================================================================
app.post("/api/lead", async (req, res) => {
  try {
    const { name, phone, email, service, message, contractorId } = req.body;

    const { data, error } = await supabase.from("leads").insert([
      {
        name,
        phone,
        email,
        service,
        message,
        contractor_id: contractorId || null,
        created_at: new Date().toISOString(),
      },
    ]).select();

    if (error) return res.json({ ok: false, error: error.message });

    res.json({ ok: true, lead: data });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ======================================================================
// POST REVIEW + IMAGE UPLOAD
// ======================================================================
app.post("/api/review", async (req, res) => {
  try {
    const contractor_id = req.body.contractor_id;
    const name = req.body.name || "Customer";
    const rating = Number(req.body.rating || 5);
    const comment = req.body.comment || "";
    const images = [];

    // Upload images
    if (req.files) {
      for (const k of Object.keys(req.files)) {
        const f = req.files[k];
        const filePath = `reviews/${Date.now()}-${f.name.replace(/\s/g, "_")}`;

        const upload = await supabase.storage
          .from("contractor-assets")
          .upload(filePath, f.data, {
            upsert: true,
            contentType: f.mimetype,
          });

        if (!upload.error) {
          const url = supabase.storage
            .from("contractor-assets")
            .getPublicUrl(filePath).data.publicUrl;

          images.push(url);
        }
      }
    }

    const { data, error } = await supabase.from("reviews").insert([
      {
        contractor_id,
        reviewer_name: name,
        rating,
        comment,
        images,
        created_at: new Date().toISOString(),
      },
    ]).select();

    if (error) return res.json({ ok: false, error: error.message });

    res.json({ ok: true, review: data });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ======================================================================
// MESSAGES — Contractor → Admin
// ======================================================================
app.post("/api/message", async (req, res) => {
  const { contractorId, message } = req.body;

  const { data, error } = await supabase.from("messages").insert([
    {
      contractor_id: contractorId,
      message,
      created_at: new Date().toISOString(),
    },
  ]).select();

  if (error) return res.json({ ok: false, error: error.message });

  res.json({ ok: true, message: data });
});

// ======================================================================
// START SERVER
// ======================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("OmniLead API running on " + PORT));
