import User from "../models/User.js";

function normalizeEnvFlag(value) {
  const raw = String(value || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export async function bootstrapSuperAdminFromEnv() {
  const email = normalizeEmail(process.env.SUPER_ADMIN_EMAIL);
  const password = String(process.env.SUPER_ADMIN_PASSWORD || "").trim();
  const firstName = String(process.env.SUPER_ADMIN_FIRST_NAME || "Super").trim() || "Super";
  const lastName = String(process.env.SUPER_ADMIN_LAST_NAME || "Admin").trim() || "Admin";
  const phone = String(process.env.SUPER_ADMIN_PHONE || "").trim();
  const syncPassword = normalizeEnvFlag(process.env.SUPER_ADMIN_SYNC_PASSWORD);

  if (!email || !password) {
    console.log("[super-admin] Skipped bootstrap: SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set");
    return { status: "skipped" };
  }

  let user = await User.findOne({ email });
  let action = "unchanged";

  if (!user) {
    user = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: "admin",
    });
    await user.save();
    console.log(`[super-admin] Created admin user for ${email}`);
    return { status: "created", userId: String(user._id) };
  }

  if (user.role !== "admin") {
    user.role = "admin";
    action = "updated";
  }
  if (firstName && user.firstName !== firstName) {
    user.firstName = firstName;
    action = "updated";
  }
  if (lastName && user.lastName !== lastName) {
    user.lastName = lastName;
    action = "updated";
  }
  if (phone && user.phone !== phone) {
    user.phone = phone;
    action = "updated";
  }

  if (syncPassword) {
    let passwordMatches = false;
    try {
      passwordMatches = await user.comparePassword(password);
    } catch {
      passwordMatches = user.password === password;
    }
    if (!passwordMatches) {
      user.password = password;
      action = "updated";
    }
  }

  if (action === "updated") {
    await user.save();
    console.log(`[super-admin] Updated admin bootstrap user for ${email}`);
    return { status: "updated", userId: String(user._id) };
  }

  console.log(`[super-admin] Admin bootstrap user already up to date for ${email}`);
  return { status: "unchanged", userId: String(user._id) };
}
