import express from "express";
import pkg from "bluelinky";
const { BlueLinky, REGIONS, BRANDS } = pkg;

const app = express();
app.use(express.json());

let client = null;
let ready = false;

async function initBluelink() {
  try {
    client = new BlueLinky({
      username: process.env.BLUELINK_USERNAME,
      password: process.env.BLUELINK_PASSWORD,
      pin: process.env.BLUELINK_PIN,
      region: REGIONS[process.env.BLUELINK_REGION],
      brand: BRANDS[process.env.BLUELINK_BRAND],
      vin: process.env.BLUELINK_VIN
    });

    await client.login();
    ready = true;
    console.log("Bluelink ready");
  } catch (err) {
    console.error("❌ Bluelinky init failed:", err);
  }
}

initBluelink();

app.get("/check", (req, res) => {
  res.json({
    ok: true,
    message: "Server running",
    hasApiKey: !!process.env.API_KEY,
    ready
  });
});

app.post("/unlock", async (req, res) => {
  if (!ready) return res.status(503).json({ ok: false, error: "Not ready" });

  try {
    await client.unlock();
    return res.json({ ok: true });
  } catch (err) {
    console.error("Unlock failed:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(process.env.PORT || 8080, () =>
  console.log("Server listening on", process.env.PORT || 8080)
);
