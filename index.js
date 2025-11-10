import express from "express";
import Bluelinky from "bluelinky";

const app = express();
const PORT = process.env.PORT || 8080;

// Normalize brand casing
function normalizeBrand(brand) {
  if (!brand) return "Hyundai";
  const b = brand.toUpperCase();
  if (b === "HYUNDAI") return "Hyundai";
  if (b === "KIA") return "Kia";
  if (b === "GENESIS") return "Genesis";
  return brand;
}

// Create Bluelinky client
const client = new Bluelinky({
  username: process.env.BLUELINK_USERNAME,
  password: process.env.BLUELINK_PASSWORD,
  pin: process.env.BLUELINK_PIN,
  region: process.env.BLUELINK_REGION || "US",
  brand: normalizeBrand(process.env.BLUELINK_BRAND || "Hyundai"),
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Bluelinky Cloud API active.",
    region: process.env.BLUELINK_REGION,
    brand: normalizeBrand(process.env.BLUELINK_BRAND),
  });
});

// Health endpoint
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    region: process.env.BLUELINK_REGION,
    brand: normalizeBrand(process.env.BLUELINK_BRAND),
  });
});

// Unlock car
app.post("/unlock", async (req, res) => {
  try {
    const vehicles = await client.getVehicles();
    if (!vehicles || vehicles.length === 0) throw new Error("No vehicles found.");
    const result = await vehicles[0].unlock();
    res.json({ ok: true, action: "unlock", result });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// Lock car
app.post("/lock", async (req, res) => {
  try {
    const vehicles = await client.getVehicles();
    if (!vehicles || vehicles.length === 0) throw new Error("No vehicles found.");
    const result = await vehicles[0].lock();
    res.json({ ok: true, action: "lock", result });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`Bluelinky API running on port ${PORT}`));
