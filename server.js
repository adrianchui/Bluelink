import express from "express";
import { BlueLinky } from "bluelinky";

const app = express();
const PORT = process.env.PORT || 8080;

// API Key
const API_KEY = process.env.API_KEY;

// Bluelink account details
const USERNAME = process.env.BLUELINK_USERNAME;
const PASSWORD = process.env.BLUELINK_PASSWORD;
const PIN = process.env.BLUELINK_PIN;
const REGION = process.env.BLUELINK_REGION || "US";
const BRAND = process.env.BLUELINK_BRAND || "HYUNDAI";

// Create client (v7 syntax)
let client;

async function createClient() {
  console.log("Creating BlueLinky client...");
  client = new BlueLinky({
    username: USERNAME,
    password: PASSWORD,
    pin: PIN,
    region: REGION,
    brand: BRAND
  });

  client.on("ready", () => {
    console.log("BlueLinky client ready!");
  });

  client.on("error", (err) => {
    console.error("BlueLinky error:", err);
  });
}

createClient(); // initialize at startup

// Middleware for API key
app.use((req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ ok: true, status: "running" });
});

// Unlock endpoint
app.post("/unlock", async (req, res) => {
  try {
    const vehicle = client.getVehicles()[0];
    if (!vehicle) {
      return res.status(500).json({ ok: false, error: "No vehicles found" });
    }

    const result = await vehicle.unlock();
    return res.json({ ok: true, result });
  } catch (err) {
    console.error("Unlock failed:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log("Server listening on port:", PORT);
});
