import express from "express";
import { BlueLinky } from "bluelinky";

const app = express();
app.use(express.json());

const API_KEY  = process.env.API_KEY;
const USER     = process.env.BLUELINK_USERNAME;
const PASS     = process.env.BLUELINK_PASSWORD;
const PIN      = process.env.BLUELINK_PIN;
const REGION   = (process.env.BLUELINK_REGION || "US").toUpperCase();
const BRAND    = (process.env.BLUELINK_BRAND  || "HYUNDAI").toUpperCase();
const PORT     = process.env.PORT || 8080;

function checkKey(req, res) {
  const k = req.headers["x-api-key"];
  if (!API_KEY || k !== API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

async function getClient() {
  return new BlueLinky({
    username: USER,
    password: PASS,
    pin: PIN,
    region: REGION,
    brand: BRAND
  });
}

app.get("/health", (req, res) => {
  res.json({ ok: true, region: REGION, brand: BRAND });
});

app.post("/lock", async (req, res) => {
  if (!checkKey(req, res)) return;
  try {
    const client = await getClient();
    const vehicles = await client.getVehicles();
    if (!vehicles?.length) throw new Error("No vehicles found — try BLUELINK_REGION=CA/US");
    const car = vehicles[0];
    await car.lock();
    res.json({ ok: true, action: "lock" });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/unlock", async (req, res) => {
  if (!checkKey(req, res)) return;
  try {
    const client = await getClient();
    const vehicles = await client.getVehicles();
    if (!vehicles?.length) throw new Error("No vehicles found — try BLUELINK_REGION=CA/US");
    const car = vehicles[0];
    await car.unlock();
    res.json({ ok: true, action: "unlock" });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
