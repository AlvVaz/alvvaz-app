#!/usr/bin/env node
import fs from "fs";
import path from "path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

const NAME_PATTERNS = [
  /\.env/i,
  /secret/i,
  /token/i,
  /password/i,
  /private/i,
  /key/i,
  /credential/i,
];

const CONTENT_PATTERNS = [
  /ADMIN_JWT_SECRET/i,
  /DATABASE_URL/i,
  /SUPABASE_/i,
  /API_KEY/i,
  /ACCESS_KEY/i,
  /SECRET/i,
  /TOKEN/i,
  /PASSWORD/i,
  /PRIVATE_KEY/i,
];

const BINARY_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".svg",
  ".tar",
  ".tiff",
  ".wav",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".zip",
  ".gz",
  ".7z",
  ".rar",
]);

const MAX_TEXT_BYTES = 256 * 1024;

function isBinaryFile(filePath) {
  return BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

const findings = [];

for (const filePath of walk(PUBLIC_DIR)) {
  const relative = path.relative(process.cwd(), filePath);
  const fileName = path.basename(filePath);

  if (NAME_PATTERNS.some((pattern) => pattern.test(fileName))) {
    findings.push({ file: relative, reason: "suspicious filename" });
    continue;
  }

  if (isBinaryFile(filePath)) {
    continue;
  }

  const stats = fs.statSync(filePath);
  if (stats.size > MAX_TEXT_BYTES) {
    continue;
  }

  try {
    const contents = fs.readFileSync(filePath, "utf8");
    if (CONTENT_PATTERNS.some((pattern) => pattern.test(contents))) {
      findings.push({ file: relative, reason: "suspicious contents" });
    }
  } catch {
    // Ignore unreadable files
  }
}

if (findings.length > 0) {
  console.error("Potential sensitive data found in public/:");
  for (const finding of findings) {
    console.error(`- ${finding.file} (${finding.reason})`);
  }
  process.exit(1);
}

console.log("public/ scan OK: no sensitive markers found.");
