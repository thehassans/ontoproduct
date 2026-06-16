import { Router } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import Setting from "../models/Setting.js";
import rateLimit from "../middleware/rateLimit.js";
import { auth, allowRoles } from "../middleware/auth.js";
import { OAuth2Client } from "google-auth-library";

// Use a default secret in development so the app works without .env
const SECRET = process.env.JWT_SECRET || "devsecret-change-me";

const router = Router();

// Seed an initial admin if none exists (dev helper)
router.post("/seed-admin", async (req, res) => {
  const {
    firstName = "Super",
    lastName = "Admin",
    email = "admin@local",
    password = "admin123",
  } = req.body || {};
  const existing = await User.findOne({ role: "admin" });
  if (existing) return res.json({ message: "Admin already exists" });
  const admin = new User({
    firstName,
    lastName,
    email,
    password,
    role: "admin",
  });
  await admin.save();
  return res.json({
    message: "Admin created",
    admin: { id: admin._id, email: admin.email },
  });
});

// Dev helper: ensure an admin exists and return a ready-to-use token
router.post("/seed-admin-login", async (req, res) => {
  const {
    firstName = "Super",
    lastName = "Admin",
    email = "admin@local",
    password = "admin123",
  } = req.body || {};
  let admin = await User.findOne({ role: "admin" });
  if (!admin) {
    admin = new User({ firstName, lastName, email, password, role: "admin" });
    await admin.save();
  }
  const token = jwt.sign(
    {
      id: admin._id,
      role: admin.role,
      firstName: admin.firstName,
      lastName: admin.lastName,
    },
    SECRET,
    { expiresIn: "7d" }
  );
  return res.json({
    token,
    user: {
      id: admin._id,
      role: admin.role,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
    },
  });
});

router.post(
  "/login",
  rateLimit({ windowMs: 60000, max: 20 }),
  async (req, res) => {
    try {
      let { email, phone, password, loginType } = req.body || {};
      const identifierRaw = String(email || phone || req.body?.identifier || "").trim();
      const e = identifierRaw.toLowerCase();
      const phoneDigits = identifierRaw.replace(/\D/g, "");
      const p = String(password || "").trim();
      if (!e || !p)
        return res.status(400).json({ message: "Invalid credentials" });

      let user = null;
      if (e.includes("@")) {
        user = await User.findOne({ email: e });
        if (!user) {
          try {
            const esc = e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            user = await User.findOne({
              email: new RegExp("^" + esc + "$", "i"),
            });
          } catch {}
        }
      }
      if (!user && phoneDigits) {
        const candidates = await User.find({ phone: { $exists: true, $ne: "" } });
        user = candidates.find(
          (candidate) =>
            String(candidate?.phone || "").replace(/\D/g, "") === phoneDigits
        ) || null;
      }
      if (!user)
        return res.status(400).json({ message: "Invalid credentials" });

      // Check if this is a customer login and user has appropriate role
      if (loginType === "customer" && user.role !== "customer") {
        return res
          .status(403)
          .json({ message: "Please use the staff login portal" });
      }

      let ok = await user.comparePassword(p);
      if (!ok) {
        // Transitional support: if the stored password appears to be plaintext and matches, rehash it now
        try {
          const looksHashed =
            typeof user.password === "string" &&
            /^\$2[aby]\$/.test(user.password);
          if (!looksHashed && user.password === p) {
            user.password = p; // triggers pre-save hook to bcrypt-hash
            await user.save();
            ok = true;
          }
        } catch {}
      }
      if (!ok) return res.status(400).json({ message: "Invalid credentials" });

      const token = jwt.sign(
        {
          id: user._id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        token,
        user: {
          id: user._id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          ...(user.role === 'partner' ? { assignedCountry: user.assignedCountry, assignedCountries: user.assignedCountries } : {}),
          ...(user.role === 'seo_manager' && Array.isArray(user.seoCountries) ? { seoCountries: user.seoCountries } : {}),
          ...(user.role === 'manager' && user.managerPermissions ? { managerPermissions: user.managerPermissions } : {}),
        },
      });
    } catch (err) {
      try {
        console.error("[auth/login] error", err?.message || err);
      } catch {}
      return res.status(500).json({ message: "Login failed" });
    }
  }
);


// Registration endpoint for customers
router.post(
  "/register",
  rateLimit({ windowMs: 60000, max: 10 }),
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        phone,
        country,
        role = "customer",
      } = req.body || {};

      // Validate required fields
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate password length
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters long" });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists" });
      }

      // Only allow customer registration through this endpoint
      if (role !== "customer") {
        return res.status(400).json({ message: "Invalid registration type" });
      }

      // Create new user
      const user = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password,
        phone: phone?.trim() || "",
        country: country || "UAE",
        role: "customer",
      });

      await user.save();

      // Generate token for auto-login
      const token = jwt.sign(
        {
          id: user._id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        SECRET,
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        message: "Registration successful",
        token,
        user: {
          id: user._id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      });
    } catch (err) {
      console.error("[auth/register] error", err?.message || err);
      return res.status(500).json({ message: "Registration failed" });
    }
  }
);

// Google OAuth login/register for customers
router.post(
  "/google",
  rateLimit({ windowMs: 60000, max: 20 }),
  async (req, res) => {
    try {
      console.log("[auth/google] Request received");
      const { credential } = req.body || {};
      
      if (!credential) {
        return res.status(400).json({ message: "Google credential is required" });
      }

      // Get Google Client ID from settings or env
      const googleDoc = await Setting.findOne({ key: "google_oauth" }).lean();
      const storedClientId = googleDoc?.value?.clientId || process.env.GOOGLE_CLIENT_ID;
      console.log("[auth/google] Client ID found:", storedClientId ? "yes" : "no");
      
      if (!storedClientId) {
        return res.status(500).json({ message: "Google OAuth not configured" });
      }

      const client = new OAuth2Client(storedClientId);
      
      let ticket;
      try {
        ticket = await client.verifyIdToken({
          idToken: credential,
          audience: storedClientId,
        });
      } catch (verifyErr) {
        console.error("[auth/google] Token verification failed:", verifyErr?.message);
        return res.status(401).json({ message: "Invalid Google token" });
      }

      const payload = ticket.getPayload();
      const { email, given_name, family_name, picture, sub: googleId } = payload;

      if (!email) {
        return res.status(400).json({ message: "Email not provided by Google" });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if user exists
      let user = await User.findOne({ email: normalizedEmail });

      if (user) {
        // User exists - check if it's a customer
        if (user.role !== "customer") {
          return res.status(403).json({ 
            message: "This email is registered as staff. Please use staff login." 
          });
        }
        
        // Update Google ID if not set
        if (!user.googleId) {
          user.googleId = googleId;
          if (picture && !user.profilePicture) {
            user.profilePicture = picture;
          }
          await user.save();
        }
      } else {
        // Create new customer account
        const randomPassword = crypto.randomBytes(32).toString('hex');
        
        user = new User({
          firstName: given_name || "Customer",
          lastName: family_name || "",
          email: normalizedEmail,
          password: randomPassword,
          role: "customer",
          googleId: googleId,
          profilePicture: picture || "",
        });
        
        await user.save();
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user._id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        token,
        user: {
          id: user._id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        isNewUser: !user.googleId,
      });
    } catch (err) {
      console.error("[auth/google] error", err?.message || err);
      return res.status(500).json({ message: "Google authentication failed" });
    }
  }
);

// Public registration endpoint for investors (self-signup)
router.post(
  "/register-investor",
  rateLimit({ windowMs: 60000, max: 10 }),
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        phone,
        ownerEmail, // optional now
        country,
      } = req.body || {};

      // Basic required fields (ownerEmail no longer required)
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      if (String(password).length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters long" });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedOwnerEmail = ownerEmail
        ? String(ownerEmail).trim().toLowerCase()
        : "";

      // Ensure investor email is not already used
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists" });
      }

      // Optional: Look up workspace owner by email (role=user) if provided, but do not error if missing/not found
      let owner = null;
      if (normalizedOwnerEmail) {
        owner = await User.findOne({
          email: normalizedOwnerEmail,
          role: "user",
        });
        if (!owner) {
          try {
            const esc = normalizedOwnerEmail.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            );
            owner = await User.findOne({
              email: new RegExp("^" + esc + "$", "i"),
              role: "user",
            });
          } catch {}
        }
      }



      const investor = new User({
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: normalizedEmail,
        password,
        phone: phone?.trim() || "",
        country: country || "UAE",
        role: "investor",
        createdBy: owner ? owner._id : undefined,
      });

      await investor.save();



      const token = jwt.sign(
        {
          id: investor._id,
          role: investor.role,
          firstName: investor.firstName,
          lastName: investor.lastName,
        },
        SECRET,
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        message: "Registration successful",
        token,
        user: {
          id: investor._id,
          role: investor.role,
          firstName: investor.firstName,
          lastName: investor.lastName,
          email: investor.email,
        },
      });
    } catch (err) {
      console.error("[auth/register-investor] error", err?.message || err);
      return res.status(500).json({ message: "Registration failed" });
    }
  }
);

// Impersonation: admin/user can generate a token for any user to login as them
router.post(
  "/impersonate",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { userId } = req.body || {};
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Valid userId is required" });
      }

      const target = await User.findById(userId);
      if (!target) {
        return res.status(404).json({ message: "User not found" });
      }

      const token = jwt.sign(
        {
          id: target._id,
          role: target.role,
          firstName: target.firstName,
          lastName: target.lastName,
        },
        SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        token,
        user: {
          id: target._id,
          role: target.role,
          firstName: target.firstName,
          lastName: target.lastName,
          email: target.email,
          phone: target.phone,
          ...(target.role === "partner"
            ? {
                assignedCountry: target.assignedCountry,
                assignedCountries: target.assignedCountries,
              }
            : {}),
          ...(target.role === "seo_manager" && Array.isArray(target.seoCountries)
            ? { seoCountries: target.seoCountries }
            : {}),
          ...(target.role === "manager" && target.managerPermissions
            ? { managerPermissions: target.managerPermissions }
            : {}),
        },
      });
    } catch (err) {
      console.error("[auth/impersonate] error", err?.message || err);
      return res.status(500).json({ message: "Impersonation failed" });
    }
  }
);

export default router;
