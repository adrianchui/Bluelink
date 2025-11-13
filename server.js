import express from "express";
import createBluelinky from "bluelinky";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY;

let client = null;
let ready = false;

async function initBluelinky() {
  try {
    console.log("🔵 Initializing Bluelinky...");

    client = await createBluelinky({
      username: process.env.BLUELINK_USER,
      password: process.env.BLUELINK_PASS,
      pin: process.env.BLUELINK_PIN,
      region: process.env.BLUELINK_REGION || "CA",
      brand: process.env.BLUELINK_BRAND || "hyundai",
    });

    ready = true;
    console.log("✅ Bluelinky initialized.");
  } catch (err) {
    console.error("❌ Bluelinky init failed:", err);
  }
}

initBluelinky();

// --- Middleware ---
function verifyKey(req, res, next) {
  if (!API_KEY || req.headers["x-api-key"] !== API_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

// --- Health Check ---
app.get("/check", (req, res) => {
  res.json({
    ok: true,
    message: "Server running",
    hasApiKey: !!API_KEY,
    ready,
  });
});

// --- Unlock ---
app.post("/unlock", verifyKey, async (req, res) => {
  if (!ready || !client) {
    return res.status(503).json({ ok: false, error: "Bluelinky not ready" });
  }

  try {
    const vehicle = client.getVehicle(process.env.BLUELINK_VIN);
    const result = await vehicle.unlock();

    return res.json({ ok: true, result });
  } catch (err) {
    console.error("Unlock error:", err);
    return res.status(500).json({ ok: false, error: "Unlock failed", details: String(err) });
  }
});

// --- Lock ---
app.post("/lock", verifyKey, async (req, res) => {
  if (!ready || !client) {
    return res.status(503).json({ ok: false, error: "Bluelinky not ready" });
  }

  try {
    const vehicle = client.getVehicle(process.env.BLUELINK_VIN);
    const result = await vehicle.lock();

    return res.json({ ok: true, result });
  } catch (err) {
    console.error("Lock error:", err);
    return res.status(500).json({ ok: false, error: "Lock failed", details: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
