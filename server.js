import express from "express";
import { Bluelinky, REGIONS, BRANDS } from "bluelinky";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

const API_KEY = process.env.API_KEY;

// Bluelink ENV Vars
const USERNAME = process.env.BLUELINK_USERNAME;
const PASSWORD = process.env.BLUELINK_PASSWORD;
const PIN = process.env.BLUELINK_PIN;
const REGION = process.env.BLUELINK_REGION || "US";
const BRAND = process.env.BLUELINK_BRAND || "HYUNDAI";

if (!API_KEY) console.error("❌ Missing API_KEY");
if (!USERNAME || !PASSWORD || !PIN) console.error("❌ Missing Bluelink credentials");

let client;

// Login at boot
async function initBluelink() {
  try {
    client = new Bluelinky({
      username: USERNAME,
      password: PASSWORD,
      pin: PIN,
      region: REGIONS[REGION],
      brand: BRANDS[BRAND],
    });

    await client.login();
    console.log("✅ Bluelink login successful");
  } catch (err) {
    console.error("❌ Bluelink login failed:", err);
  }
}

initBluelink();

// AUTH CHECK
function verifyKey(req, res) {
  if (req.headers["x-api-key"] !== API_KEY)
    return res.status(401).json({ ok: false, error: "Unauthorized" });
}

// ROOT TEST
app.get("/", (req, res) => {
  res.json({
    ok: true,
    region: REGION,
    brand: BRAND,
  });
});

// UNLOCK
app.post("/unlock", async (req, res) => {
  verifyKey(req, res);

  try {
    const vehicle = client.getVehicles()[0];
    const result = await vehicle.unlock();
    res.json({ ok: true, result });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
