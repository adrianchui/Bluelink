import express from "express";
import Bluelinky from "bluelinky";

const app = express();
app.use(express.json());

const {
  API_KEY,
  BLUELINK_USERNAME,
  BLUELINK_PASSWORD,
  BLUELINK_PIN,
  BLUELINK_REGION,
  BLUELINK_BRAND
} = process.env;

if (!API_KEY) {
  console.error("Missing API_KEY");
  process.exit(1);
}

const client = new Bluelinky({
  username: BLUELINK_USERNAME,
  password: BLUELINK_PASSWORD,
  pin: BLUELINK_PIN,
  region: BLUELINK_REGION,
  brand: BLUELINK_BRAND
});

app.use((req, res, next) => {
  const key = req.header("X-API-Key");
  if (key !== API_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    region: BLUELINK_REGION,
    brand: BLUELINK_BRAND
  });
});

app.post("/unlock", async (req, res) => {
  try {
    const vehicles = await client.getVehicles();
    const car = vehicles[0];
    await car.unlock();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: err.message });
  }
});

app.post("/lock", async (req, res) => {
  try {
    const vehicles = await client.getVehicles();
    const car = vehicles[0];
    await car.lock();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
