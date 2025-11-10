// index.js
const express = require("express");
const pino = require("pino");
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// Handle different module shapes for 'bluelinky'
let BluelinkyLib = require("bluelinky");
const Bluelinky =
  BluelinkyLib.Bluelinky || BluelinkyLib.default || BluelinkyLib;

const app = express();
app.use(express.json());

// --- Config & helpers -------------------------------------------------------
const PORT = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY || process.env.X_API_KEY;

function normalizeRegion(input) {
  if (!input) return "US";
  const v = String(input).trim().toUpperCase();
  if (["US", "CA", "EU"].includes(v)) return v;
  return "US";
}

function normalizeBrand(input) {
  if (!input) return "Hyundai";
  const v = String(input).trim().toUpperCase();
  if (v === "KIA") return "Kia";
  return "Hyundai";
}

// Read env with normalization (used by runtime)
const ENV = {
  USERNAME: process.env.BLUELINK_USERNAME,
  PASSWORD: process.env.BLUELINK_PASSWORD,
  PIN: process.env.BLUELINK_PIN,
  REGION: normalizeRegion(process.env.BLUELINK_REGION),
  BRAND: normalizeBrand(process.env.BLUELINK_BRAND),
};

// Keep a single client/vehicle in memory for speed
let client = null;
let vehicle = null;

async function ensureClient() {
  if (client && vehicle) return { client, vehicle };

  if (!ENV.USERNAME || !ENV.PASSWORD || !ENV.PIN) {
    throw new Error("Missing BLUELINK credentials in env.");
  }

  logger.info(
    { region: ENV.REGION, brand: ENV.BRAND },
    "Initializing Bluelinky client"
  );

  client = new Bluelinky({
    username: ENV.USERNAME,
    password: ENV.PASSWORD,
    pin: ENV.PIN,
    region: ENV.REGION, // "US" | "CA" | "EU"
    brand: ENV.BRAND,   // "Hyundai" | "Kia"
    autoLogin: true,
  });

  // login + get first vehicle
  await client.login();
  const vehicles = await client.getVehicles();
  if (!vehicles || !vehicles.length) {
    throw new Error("No vehicles returned for this account.");
  }
  vehicle = vehicles[0];
  logger.info({ vin: vehicle.vin }, "Vehicle ready");

  return { client, vehicle };
}

// --- Auth middleware ---------------------------------------------------------
app.use((req, res, next) => {
  if (!API_KEY) return next(); // if you intentionally left it open
  const k = req.header("x-api-key");
  if (k && k === API_KEY) return next();
  return res.status(401).json({ ok: false, error: "Unauthorized" });
});

// --- Routes ------------------------------------------------------------------

// Health: print *normalized* brand so it matches the lib usage
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    region: ENV.REGION,
    brand: ENV.BRAND,
  });
});

// Quick ping to (re)login and cache the vehicle
app.post("/wake", async (_req, res) => {
  try {
    await ensureClient();
    res.json({ ok: true });
  } catch (err) {
    logger.error(err, "Wake failed");
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.post("/lock", async (_req, res) => {
  try {
    const { vehicle } = await ensureClient();
    const r = await vehicle.lock();
    res.json({ ok: true, result: r });
  } catch (err) {
    logger.error(err, "Lock failed");
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.post("/unlock", async (_req, res) => {
  try {
    const { vehicle } = await ensureClient();
    const r = await vehicle.unlock();
    res.json({ ok: true, result: r });
  } catch (err) {
    logger.error(err, "Unlock failed");
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

// default root
app.get("/", (_req, res) => {
  res.type("text").send("OK");
});

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT }, "Server listening");
});
