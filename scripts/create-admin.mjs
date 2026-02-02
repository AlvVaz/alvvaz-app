#!/usr/bin/env node
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const [,, emailArg, passwordArg, maybeUsernameOrRole, maybeRole] = process.argv;

if (!emailArg || !passwordArg) {
  console.error(
    "Usage: node scripts/create-admin.mjs <email> <password> [username] [owner|admin]"
  );
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const isRole =
  maybeUsernameOrRole === "owner" || maybeUsernameOrRole === "admin";
const role =
  maybeRole === "owner" || maybeRole === "admin"
    ? maybeRole
    : isRole
    ? maybeUsernameOrRole
    : "admin";
const username =
  (!isRole && maybeUsernameOrRole ? maybeUsernameOrRole : "")?.trim().toLowerCase() ||
  email.split("@")[0];

if (username.length < 3 || /\s/.test(username)) {
  console.error("Username must be at least 3 characters and contain no spaces.");
  process.exit(1);
}

const existing = await prisma.adminUser.findFirst({
  where: {
    OR: [{ email }, { username }],
  },
});
if (existing) {
  console.error("Admin already exists for:", email, "or username:", username);
  await prisma.$disconnect();
  process.exit(1);
}

const passwordHash = await bcrypt.hash(passwordArg, 12);

await prisma.adminUser.create({
  data: {
    username,
    email,
    passwordHash,
    role,
  },
});

console.log("Admin created:", email, "username:", username, "role:", role);
await prisma.$disconnect();
