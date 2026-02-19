import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import { connectDB } from "./modules/config/db.js";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Product from "./modules/models/Product.js";
import { initSocket, getIO } from "./modules/config/socket.js";
import productsRoutes from "./modules/routes/products.js";
import authRoutes from "./modules/routes/auth.js";
import userRoutes from "./modules/routes/users.js";
import ordersRoutes from "./modules/routes/orders.js";
import warehouseRoutes from "./modules/routes/warehouse.js";
import managerStockRoutes from "./modules/routes/managerStock.js";
import financeRoutes from "./modules/routes/finance.js";
import supportRoutes from "./modules/routes/support.js";
import settingsRoutes from "./modules/routes/settings.js";
import notificationsRoutes from "./modules/routes/notifications.js";
import ecommerceRoutes from "./modules/routes/ecommerce.js";
import reportsRoutes from "./modules/routes/reports.js";
import geocodeRoutes from "./modules/routes/geocode.js";
import shopifyRoutes from "./modules/routes/shopify.js";
import websiteSettingsRoutes from "./modules/routes/websiteSettings.js";
import dropshipperRoutes from "./modules/routes/dropshippers.js";
import dropshipperShopifyRoutes from "./modules/routes/dropshipperShopify.js";
import settingsShopifyRoutes from "./modules/routes/settingsShopify.js";
import shopifyOAuthRoutes from "./modules/routes/shopifyOAuth.js";
import reviewsRoutes from "./modules/routes/reviews.js";
import commissionersRoutes from "./modules/routes/commissioners.js";
import referencesRoutes from "./modules/routes/references.js";
import confirmersRoutes from "./modules/routes/confirmers.js";
import couponsRoutes from "./modules/routes/coupons.js";
import moyasarRoutes from "./modules/routes/moyasar.js";
import categoriesRoutes from "./modules/routes/categories.js";
import brandsRoutes from "./modules/routes/brands.js";
import exploreMoreRoutes from "./modules/routes/exploreMore.js";


dotenv.config();

// Early boot diagnostics
console.log("[api] Booting API...");
console.log("[api] ENV", {
  PORT: process.env.PORT,
  USE_MEMORY_DB: process.env.USE_MEMORY_DB,
  ENABLE_WA: process.env.ENABLE_WA,
  MONGO_URI_SET: Boolean(process.env.MONGO_URI),
});

// Prevent process exit on unexpected async errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

const app = express();

// Create HTTP server with Android compatibility settings
const server = http.createServer(
  {
    // Force HTTP/1.1 compatibility for better Android support
    maxHeaderSize: 16384,
    keepAlive: true,
    keepAliveTimeout: 65000,
  },
  app
);

// Increase server timeouts for large file uploads (15 minutes)
server.timeout = 900000; // 15 min request timeout
server.headersTimeout = 910000; // Slightly higher than timeout
server.requestTimeout = 900000; // 15 min for entire request

initSocket(server);

// Initialize Firebase Admin SDK for push notifications (lazy, non-blocking)
import('./modules/config/firebase.js')
  .then(m => m.initFirebase())
  .catch(e => console.warn('Firebase init skipped:', e.message));

// Behind Plesk / nginx, trust proxy headers for correct protocol/IP handling
try {
  app.set("trust proxy", 1);
} catch {}

const PORT = process.env.PORT || 4000;

// Flexible CORS: allow comma-separated origins from env, wildcard '*', and common local dev hosts
const envOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow non-browser clients
    const allowed = envOrigins;
    const isWildcard = allowed.includes("*");
    const isListed = allowed.includes(origin);
    
    // Always allow mobile app origins (Capacitor/Cordova)
    // Android: http://localhost, https://localhost
    // iOS: capacitor://localhost
    const isMobileOrigin = origin.startsWith('http://localhost') || origin.startsWith('https://localhost') || origin.startsWith('capacitor://');
    
    if (isWildcard || isListed || isMobileOrigin) return cb(null, true);
    return cb(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Global body parsing with rawBody capture for verifySignature
app.use((req, res, next) => {
  if (req.path.startsWith("/socket.io")) {
    return next();
  }
  express.json({
    limit: "100mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })(req, res, next);
});
// Skip morgan logging for Socket.IO requests (reduces noise)
app.use((req, res, next) => {
  if (req.path.startsWith("/socket.io")) {
    return next();
  }
  morgan("dev")(req, res, next);
});

// Fix for Android ERR_QUIC_PROTOCOL_ERROR - disable HTTP/3
app.use((req, res, next) => {
  // Disable HTTP/3 (QUIC) advertisement
  res.setHeader("Alt-Svc", "clear");
  // Ensure compatibility with HTTP/1.1 and HTTP/2
  res.setHeader("Connection", "keep-alive");
  next();
});

app.get("/api/health", (_req, res) => {
  const dbState = mongoose.connection?.readyState ?? 0; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  const stateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const io = getIO();
  const socketHealth = io
    ? {
        connected: io.engine.clientsCount,
        transports: ["websocket", "polling"],
        status: "ok",
      }
    : { status: "not_initialized" };
  res.json({
    name: "BuySial Commerce API",
    status: "ok",
    db: { state: dbState, label: stateMap[dbState] || String(dbState) },
    websocket: socketHealth,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/manager-stock", managerStockRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/geocode", geocodeRoutes);
app.use("/api/ecommerce", ecommerceRoutes);
app.use("/api/shopify", shopifyRoutes);
app.use("/api/settings/shopify", settingsShopifyRoutes);
app.use("/api/settings/shopify", shopifyOAuthRoutes); // OAuth app config routes
app.use("/api/settings/website", websiteSettingsRoutes);
app.use("/api/dropshippers", dropshipperRoutes);
app.use("/api/dropshippers/shopify", dropshipperShopifyRoutes);
app.use("/api/shopify", shopifyOAuthRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/commissioners", commissionersRoutes);
app.use("/api/confirmer", confirmersRoutes);
app.use("/api/coupons", couponsRoutes);
app.use("/api/references", referencesRoutes);
app.use("/api/moyasar", moyasarRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/brands", brandsRoutes);
app.use("/api/explore-more", exploreMoreRoutes);

// Serve uploaded product images from a robustly resolved directory
function resolveUploadsDir() {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.resolve("/httpdocs/uploads"),
      path.resolve("/httpdocs/backend/uploads"),
      path.resolve(here, "../../uploads"),
      path.resolve(here, "uploads"),
      path.resolve(process.cwd(), "uploads"),
      path.resolve(process.cwd(), "backend/uploads"),
      path.resolve(process.cwd(), "../backend/uploads"),
      path.resolve(here, "../uploads"),
    ];
    for (const c of candidates) {
      try {
        if (!fs.existsSync(c)) continue;
        const st = fs.statSync(c);
        if (!st.isDirectory()) continue;
        const entries = fs.readdirSync(c);
        if (Array.isArray(entries) && entries.length > 0) return c;
      } catch {}
    }
    for (const c of candidates) {
      try {
        if (!fs.existsSync(c)) continue;
        const st = fs.statSync(c);
        if (st.isDirectory()) return c;
      } catch {}
    }
    for (const c of candidates) {
      try {
        fs.mkdirSync(c, { recursive: true });
        return c;
      } catch {}
    }
  } catch {}
  try {
    fs.mkdirSync("uploads", { recursive: true });
  } catch {}
  return path.resolve("uploads");
}
const UPLOADS_DIR = resolveUploadsDir();
const UPLOADS_DIRS = (() => {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      UPLOADS_DIR,
      path.resolve("/httpdocs/uploads"),
      path.resolve("/httpdocs/backend/uploads"),
      path.resolve(here, "uploads"),
      path.resolve(here, "../uploads"),
      path.resolve(process.cwd(), "uploads"),
      path.resolve(process.cwd(), "backend/uploads"),
      path.resolve(process.cwd(), "../backend/uploads"),
    ];
    const expanded = [];
    for (const c of candidates) {
      if (!c) continue;
      expanded.push(c);
      try {
        expanded.push(path.resolve(c, "uploads"));
      } catch {}
    }

    const uniq = [];
    for (const d of expanded) {
      try {
        const p = path.resolve(String(d || ""));
        if (!p || uniq.includes(p)) continue;
        if (!fs.existsSync(p)) continue;
        const st = fs.statSync(p);
        if (!st.isDirectory()) continue;
        uniq.push(p);
      } catch {}
    }
    return uniq.length ? uniq : [UPLOADS_DIR];
  } catch {
    return [UPLOADS_DIR];
  }
})();
const uploadsStaticOpts = {
  setHeaders: (res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=86400");
    } catch {}
  },
};
try {
  console.log("[api] Serving uploads from:", UPLOADS_DIRS);
} catch {}
for (const dir of UPLOADS_DIRS) {
  app.use(["/uploads", "/api/uploads"], express.static(dir, uploadsStaticOpts));
}

// Serve frontend static build if available (single-server deploy)
// Set SERVE_STATIC=false in env to disable.
let CLIENT_DIST = null;
let INDEX_HTML = null;
try {
  const serveStatic = process.env.SERVE_STATIC !== "false";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const candidates = [
    // Explicit override for Plesk: set FRONTEND_DIST to the absolute dist path
    ...(process.env.FRONTEND_DIST
      ? [path.resolve(process.env.FRONTEND_DIST)]
      : []),
    path.resolve(process.cwd(), "../frontend/dist"),
    path.resolve(process.cwd(), "frontend/dist"),
    path.resolve(__dirname, "../../frontend/dist"),
    // Plesk typical docroot layout: if app root is /httpdocs/backend, this is redundant with ../frontend/dist
    // but we include it for clarity/explicitness
    path.resolve("/httpdocs/frontend/dist"),
  ];
  for (const c of candidates) {
    try {
      const idx = path.join(c, "index.html");
      if (fs.existsSync(idx)) {
        CLIENT_DIST = c;
        INDEX_HTML = idx;
        break;
      }
    } catch {}
  }
  if (serveStatic && CLIENT_DIST && INDEX_HTML) {
    app.use(express.static(CLIENT_DIST));
    console.log("Serving frontend from:", CLIENT_DIST);
  } else if (!serveStatic) {
    console.log("Static serving disabled via SERVE_STATIC=false");
  } else {
    try {
      console.warn(
        "Frontend dist not found, SPA will not be served. Checked candidates:\n" +
          candidates.map((c, i) => `  ${i + 1}. ${c}`).join("\n")
      );
    } catch {
      console.warn("Frontend dist not found, SPA will not be served.");
    }
  }
} catch (e) {
  console.warn("Static serve setup skipped:", e?.message || e);
}

// Serve PWA manifest and favicons directly from dist root if available
app.get(
  ["/manifest.webmanifest", "/favicon.svg", "/favicon.ico"],
  (req, res, next) => {
    if (req.path === "/manifest.webmanifest") {
      return res.redirect("/api/settings/manifest");
    }
    if (!INDEX_HTML || !CLIENT_DIST) return next();
    const f = path.join(CLIENT_DIST, req.path.replace("..", ""));
    if (fs.existsSync(f)) return res.sendFile(f);
    return next();
  }
);

function getPublicBaseUrl(req) {
  try {
    const env =
      process.env.FRONTEND_URL ||
      process.env.BASE_URL ||
      process.env.PUBLIC_URL ||
      "";
    const cleaned = String(env || "").trim().replace(/\/$/, "");
    if (cleaned) return cleaned;
  } catch {}
  try {
    const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https")
      .toString()
      .split(",")[0]
      .trim();
    const host = (req.headers["x-forwarded-host"] || req.get("host") || "")
      .toString()
      .split(",")[0]
      .trim();
    if (!host) return "https://buysial.com";
    return `${proto}://${host}`.replace(/\/$/, "");
  } catch {
    return "https://buysial.com";
  }
}

function xmlEscape(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

app.get("/robots.txt", (req, res) => {
  try {
    const baseUrl = getPublicBaseUrl(req);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(
      `User-agent: *\n` +
        `Allow: /\n` +
        `Disallow: /api/\n` +
        `Disallow: /user/\n` +
        `Disallow: /manager/\n` +
        `Disallow: /agent/\n` +
        `Disallow: /admin/\n` +
        `Disallow: /customer/\n` +
        `Disallow: /investor/\n` +
        `Disallow: /commissioner/\n` +
        `Disallow: /confirmer/\n` +
        `Sitemap: ${baseUrl}/sitemap.xml\n`
    );
  } catch {
    return res.status(200).send("User-agent: *\nAllow: /\n");
  }
});

app.get("/sitemap.xml", async (req, res) => {
  const baseUrl = getPublicBaseUrl(req);
  const now = new Date();

  const staticPaths = [
    "/",
    "/home",
    "/catalog",
    "/categories",
    "/about",
    "/contact",
    "/terms",
    "/privacy",
    "/returns",
  ];

  let products = [];
  try {
    products = await Product.find({
      displayOnWebsite: true,
      $or: [{ noIndex: { $exists: false } }, { noIndex: false }],
    })
      .select("_id updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .lean();
  } catch (e) {
    console.warn("[sitemap] Failed to load products (serving static only):", e?.message);
    products = [];
  }

  const urls = [];
  for (const p of staticPaths) {
    urls.push({ loc: `${baseUrl}${p}`, lastmod: now.toISOString() });
  }
  for (const p of products) {
    const last = p?.updatedAt || p?.createdAt || now;
    urls.push({
      loc: `${baseUrl}/product/${p._id}`,
      lastmod: new Date(last).toISOString(),
    });
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n` +
          `    <loc>${xmlEscape(u.loc)}</loc>\n` +
          `    <lastmod>${xmlEscape(u.lastmod)}</lastmod>\n` +
          `  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(xml);
});

// SPA fallback: let client router handle 404s (but do NOT intercept API, Socket.IO, or upload paths)
app.get("*", (req, res, next) => {
  try {
    const p = req.path || "";
    if (p.startsWith("/api/")) return next();
    if (p.startsWith("/socket.io")) return next();
    if (p.startsWith("/uploads")) return next();
    if (INDEX_HTML && fs.existsSync(INDEX_HTML)) {
      try {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      } catch {}
      return res.sendFile(INDEX_HTML);
    }
    // If no index.html found, return helpful error
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Frontend Not Built</title></head>
        <body style="font-family:system-ui;padding:40px;max-width:600px;margin:0 auto;">
          <h1>⚠️ Frontend Not Built</h1>
          <p>The frontend application hasn't been built yet.</p>
          <p><strong>To fix this:</strong></p>
          <ol>
            <li>Navigate to the frontend directory: <code>cd frontend</code></li>
            <li>Install dependencies: <code>npm install</code></li>
            <li>Build for production: <code>npm run build</code></li>
            <li>Restart the backend server</li>
          </ol>
          <p style="color:#666;margin-top:30px;">Backend API is running on port ${PORT}</p>
        </body>
      </html>
    `);
  } catch {
    return next();
  }
});

// Start HTTP server immediately; connect to DB in background so endpoints are reachable during DB spin-up
server.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
  // Register optional routes in background
  registerOptionalRoutes().catch(() => {});
});

// If listen does not print in 5s, emit a hint
setTimeout(() => {
  try {
    console.log(
      '[api] If you do not see "API running" above, startup may be blocked by an import error.'
    );
  } catch {}
}, 5000);
connectDB()
  .then(async () => {
    console.log("Database connected");

    // AUTO-CLEANUP: Delete corrupted remittances (one-time fix for calculation bug)
    try {
      const mongoose = (await import("mongoose")).default;
      const Remittance = mongoose.model("Remittance");
      const User = mongoose.model("User");

      // Delete remittances created before the bug fix (Dec 4, 2025)
      const bugFixDate = new Date("2025-12-04T10:00:00Z");
      const corruptedQuery = {
        status: "accepted",
        createdAt: { $lt: bugFixDate },
      };

      const count = await Remittance.countDocuments(corruptedQuery);
      if (count > 0) {
        console.log(
          `[MIGRATION] Found ${count} corrupted remittance(s), cleaning up...`
        );
        await Remittance.deleteMany(corruptedQuery);

        // Reset all drivers' paidCommission to 0
        await User.updateMany(
          { role: "driver" },
          { $set: { "driverProfile.paidCommission": 0 } }
        );

        console.log(
          `[MIGRATION] ✅ Deleted ${count} corrupted remittance(s) and reset driver balances`
        );
      } else {
        console.log("[MIGRATION] No corrupted remittances found");
      }
    } catch (cleanupErr) {
      console.error(
        "[MIGRATION] Cleanup failed (continuing anyway):",
        cleanupErr?.message
      );
    }
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

async function registerOptionalRoutes() {
  try {
    const enableWA = process.env.ENABLE_WA !== "false";
    if (enableWA) {
      const { default: waRoutes } = await import("./modules/routes/wa.js");
      app.use("/api/wa", waRoutes);
      console.log("WhatsApp routes enabled");

      // Start agent reminder background job
      try {
        const { getWaService } = await import("./modules/services/whatsappCloud.js");
        const { startAgentReminderJob } = await import(
          "./modules/jobs/agentReminders.js"
        );
        startAgentReminderJob(getWaService);
      } catch (jobErr) {
        console.error(
          "Failed to start agent reminder job (continuing):",
          jobErr?.message || jobErr
        );
      }
    } else {
      console.log("WhatsApp routes disabled via ENABLE_WA=false");
    }

    // Start daily profit distribution cron job (runs at midnight)
    try {
      const { startDailyProfitJob } = await import(
        "./modules/jobs/dailyProfit.js"
      );
      startDailyProfitJob();
      console.log("Daily profit distribution job started");
    } catch (jobErr) {
      console.error(
        "Failed to start daily profit job (continuing):",
        jobErr?.message || jobErr
      );
    }
  } catch (err) {
    console.error(
      "Failed to init WhatsApp routes (continuing):",
      err?.message || err
    );
  }
}
