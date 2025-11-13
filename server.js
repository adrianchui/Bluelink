import express from "express";
import pkg from "bluelinky";
const { BlueLinky } = pkg;

const app = express();
const PORT = process.env.PORT || 8080;

const API_KEY = process.env.API_KEY;
const USERNAME = process.env.BLUELINK_USERNAME;
const PASSWORD = process.env.BLUELINK_PASSWORD;
const PIN = process.env.BLUELINK_PIN;
const REGION = process.env.BLUELINK_REGION || "US";
const BRAND = process.env.BLUELINK_BRAND || "HYUNDAI";

let client = null;
let ready = false;

async function init() {
  console.log("Initializing BlueLinky...");
  try {
    client = new BlueLinky({
      username: USERNAME,
      password: PASSWORD,
      pin: PIN,
      region: REGION,
      brand: BRAND
    });

    client.on("ready", () => {
      console.log("Bluelinky ready!");
      ready = true;
    });

    client.on("error", (err) => {
      console.error("Bluelinky error:", err);
    });
  } catch (err) {
    console.error("Bluelinky init failed:", err);
  }
}

init();

app.get("/check", (req, res) => {
  const hasApiKey = !!API_KEY;
  res.json({ ok: true, message: "Server running", hasApiKey, ready });
});

app.use((req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
});

app.post("/unlock", async (req, res) => {
  if (!ready) return res.status(503).json({ ok: false, error: "Client not ready" });
  try {
    const vehicle = client.getVehicles()[0];
    const result = await vehicle.unlock();
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log("Server listening on", PORT);
});
