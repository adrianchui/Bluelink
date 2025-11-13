import express from "express";
import { Bluelinky } from "bluelinky";

const app = express();
app.use(express.json());

// Load credentials from Cloud Run env vars
const {
  BLUELINK_USERNAME,
  BLUELINK_PASSWORD,
  BLUELINK_PIN,
  BLUELINK_REGION,
  BLUELINK_BRAND,
  API_KEY
} = process.env;

if (!API_KEY) {
  console.error("ERROR: Missing API_KEY env var.");
  process.exit(1);
}

let client = null;
let vehicle = null;

// ------------------------------
// Initialize Bluelinky v7 Client
// ------------------------------
async function initBluelinky() {
  if (client && vehicle) return { client, vehicle };

  console.log("Initializing Bluelinky client…");

  client = new Bluelinky({
    username: BLUELINK_USERNAME,
    password: BLUELINK_PASSWORD,
    pin: BLUELINK_PIN,
    region: BLUELINK_REGION ?? "US",
    brand: BLUELINK_BRAND ?? "HYUNDAI"
  });

  // Login (v7 uses OAuth behind the scenes)
  await client.login();

  const vehicles = await client.getVehicles();

  if (!vehicles.length) {
    throw new Error("No vehicles found in account.");
  }

  vehicle = vehicles[0];

  console.log(`Bluelinky initialized. Vehicle: ${vehicle.vin}`);

  return { client, vehicle };
}

// ------------------------------
// Middleware: API Key Validation
// ------------------------------
function requireKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

// ------------------------------
// API Endpoint Helpers
// ------------------------------
async function action(res, fn) {
  try {
    await initBluelinky();
    const result = await fn();
    return res.json({ ok: true, result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// ------------------------------
// Routes
// ------------------------------
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Bluelinky API running" });
});

app.post("/unlock", requireKey, (req, res) =>
  action(res, () => vehicle.unlock())
);

app.post("/lock", requireKey, (req, res) =>
  action(res, () => vehicle.lock())
);

app.post("/start", requireKey, (req, res) =>
  action(res, () => vehicle.start())
);

app.post("/stop", requireKey, (req, res) =>
  action(res, () => vehicle.stop())
);

app.get("/status", requireKey, (req, res) =>
  action(res, () => vehicle.status())
);

// ------------------------------
// Start Server (Cloud Run needs PORT)
// ------------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
