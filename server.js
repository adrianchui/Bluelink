import express from "express";
import pkg from "bluelinky";

const { BlueLinky } = pkg;

const app = express();
app.use(express.json());

let client = null;
let vehicle = null;
let ready = false;

async function initBluelink() {
  try {
    console.log("🔵 Starting Bluelinky init...");

    client = new BlueLinky({
      username: process.env.BLUELINK_USERNAME,
      password: process.env.BLUELINK_PASSWORD,
      pin: process.env.BLUELINK_PIN,
      region: process.env.BLUELINK_REGION || "CA",
      brand: process.env.BLUELINK_BRAND || "HYUNDAI"
    });

    await client.login();
    console.log("✅ Logged into Bluelink");

    const vehicles = client.getVehicles();
    console.log("Found vehicles:", vehicles.length);

    const vin = process.env.BLUELINK_VIN;
    vehicle = vehicles.find(v => v.vin.startsWith(vin.substring(0, 8)));

    if (!vehicle) {
      console.error("❌ VIN not found in account!");
      ready = false;
      return;
    }

    console.log("🚗 Selected vehicle:", vehicle.vin);

    ready = true;
  } catch (err) {
    console.error("❌ Bluelinky init failed:", err);
    ready = false;
  }
}

// Auto-retry login every 5 mins (Cloud Run idle kills sessions)
setInterval(() => {
  if (!ready) initBluelink();
}, 300000);

// Run init at startup
initBluelink();

app.get("/check", (req, res) => {
  res.json({
    ok: true,
    message: "Server running",
    hasApiKey: !!process.env.API_KEY,
    ready
  });
});

// API KEY middleware
app.use((req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key || key !== process.env.API_KEY)
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  next();
});

app.post("/unlock", async (req, res) => {
  if (!ready) return res.json({ ok: false, error: "Not ready" });
  try {
    const result = await vehicle.unlock();
    res.json({ ok: true, result });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: err.message });
  }
});

app.post("/lock", async (req, res) => {
  if (!ready) return res.json({ ok: false, error: "Not ready" });
  try {
    const result = await vehicle.lock();
    res.json({ ok: true, result });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.get("/status", async (req, res) => {
  if (!ready) return res.json({ ok: false, error: "Not ready" });
  try {
    const result = await vehicle.status();
    res.json({ ok: true, result });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post("/start", async (req, res) => {
  if (!ready) return res.json({ ok: false, error: "Not ready" });
  try {
    const result = await vehicle.start();
    res.json({ ok: true, result });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Server is running on port", process.env.PORT || 8080);
});
