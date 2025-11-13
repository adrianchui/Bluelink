import bluelinkyPkg from "bluelinky";

const Bluelinky = bluelinkyPkg.default;
const { REGIONS, BRANDS } = bluelinkyPkg;

if (typeof Bluelinky !== "function") {
  console.error("❌ Bluelinky default export not found.");
  console.error("Keys available:", Object.keys(bluelinkyPkg));
  process.exit(1);
}


const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY;

// Accept BOTH naming schemes to avoid env mismatches
const USERNAME = process.env.BLUELINK_USERNAME || process.env.BLUELINK_USER;
const PASSWORD = process.env.BLUELINK_PASSWORD || process.env.BLUELINK_PASS;
const PIN      = process.env.BLUELINK_PIN;
const REGION   = (process.env.BLUELINK_REGION || "CA");      // e.g., "CA" or "US"
const BRAND    = (process.env.BLUELINK_BRAND || "HYUNDAI");  // e.g., "HYUNDAI" or "KIA"
const VIN      = process.env.BLUELINK_VIN;                   // 17-char VIN

let client = null;
let vehicle = null;
let ready = false;

function haveCreds() {
  return Boolean(USERNAME && PASSWORD && PIN && REGION && BRAND);
}

async function initBluelink() {
  try {
    console.log("🔵 Initializing Bluelinky…");

    if (!haveCreds()) {
      console.error("Missing credentials. Check BLUELINK_* env vars.");
      ready = false;
      return;
    }

    client = new BlueLinky({
      username: USERNAME,
      password: PASSWORD,
      pin: PIN,
      region: REGION,   // don't rely on REGIONS enum; strings are accepted in older builds
      brand: BRAND      // same here
    });

    client.on("error", (err) => {
      console.error("Bluelinky error:", err?.message || err);
      // keep running; Cloud Run will keep container alive
    });

    client.on("ready", () => {
      try {
        const vehicles = client.getVehicles?.() || [];
        if (!vehicles.length) {
          console.error("No vehicles returned by Bluelinky.");
          ready = false;
          return;
        }

        if (VIN) {
          vehicle = vehicles.find(v => (v.vin || "").toUpperCase().startsWith(VIN.toUpperCase().slice(0, 8)))
                 || vehicles.find(v => (v.vin || "").toUpperCase() === VIN.toUpperCase())
                 || vehicles[0];
        } else {
          vehicle = vehicles[0];
        }

        console.log("✅ Bluelinky ready. Selected VIN:", vehicle?.vin || "(unknown)");
        ready = Boolean(vehicle);
      } catch (selErr) {
        console.error("Vehicle selection failed:", selErr?.message || selErr);
        ready = false;
      }
    });

    // Some versions auto-login and emit 'ready'; do NOT call client.login() if not present
    if (typeof client.login === "function") {
      await client.login(); // newer versions
      // If this succeeds but 'ready' never fires, we still rely on ready flag
    }
  } catch (err) {
    console.error("❌ Bluelinky init failed:", err?.message || err);
    ready = false;
  }
}

// Health/diagnostic endpoint (no auth)
app.get("/check", (_req, res) => {
  res.json({
    ok: true,
    message: "Server running",
    hasApiKey: !!API_KEY,
    hasCreds: haveCreds(),
    ready
  });
});

// Simple API key auth
app.use((req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!API_KEY || key !== API_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
});

app.post("/unlock", async (_req, res) => {
  if (!ready || !vehicle) return res.status(503).json({ ok: false, error: "Not ready" });
  try {
    const result = await vehicle.unlock();
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/lock", async (_req, res) => {
  if (!ready || !vehicle) return res.status(503).json({ ok: false, error: "Not ready" });
  try {
    const result = await vehicle.lock();
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/status", async (_req, res) => {
  if (!ready || !vehicle) return res.status(503).json({ ok: false, error: "Not ready" });
  try {
    const result = await vehicle.status?.();
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log("HTTP server listening on", PORT);
  // Kick off init after the HTTP server is up so Cloud Run sees a healthy port
  initBluelink();
});
