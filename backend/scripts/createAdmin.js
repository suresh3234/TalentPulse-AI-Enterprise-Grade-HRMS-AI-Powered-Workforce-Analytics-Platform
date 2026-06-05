require("dotenv").config();

const connectDB = require("../config/database");
const User = require("../models/user.model");

const DEFAULT_ADMIN = {
  fullName: process.env.ADMIN_NAME || "HRMS Admin",
  email: (process.env.ADMIN_EMAIL || "admin@hrms.com").trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || "Admin@123",
};

const run = async () => {
  try {
    await connectDB();

    let admin = await User.findOne({ email: DEFAULT_ADMIN.email });

    if (!admin) {
      admin = new User({
        fullName: DEFAULT_ADMIN.fullName,
        email: DEFAULT_ADMIN.email,
        password: DEFAULT_ADMIN.password,
        role: "admin",
      });

      await admin.save();
      console.log(`Admin user created: ${admin.email}`);
      process.exit(0);
    }

    admin.fullName = DEFAULT_ADMIN.fullName || admin.fullName;
    admin.role = "admin";

    if (process.env.ADMIN_PASSWORD) {
      admin.password = process.env.ADMIN_PASSWORD;
    }

    await admin.save();
    console.log(`User promoted to admin: ${admin.email}`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to create admin user:", error.message);
    process.exit(1);
  }
};

run();
