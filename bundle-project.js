import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC_DIR = path.resolve(__dirname); // project root
const OUTPUT_FILE = path.resolve(__dirname, "project-bundle.js");

function parseGitignore(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function shouldIgnore(relPath, ignoreRules) {
  return ignoreRules.some((pattern) => {
    if (pattern.endsWith("/")) {
      return relPath.startsWith(pattern.slice(0, -1) + "/");
    }
    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\./g, "\\.") + "$"
      );
      return regex.test(relPath);
    }
    return relPath === pattern;
  });
}

function collectFiles(dir, base, ignoreRules, files = []) {
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const relPath = path.relative(base, fullPath).replace(/\\/g, "/");

    if (shouldIgnore(relPath, ignoreRules)) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(fullPath, base, ignoreRules, files);
    } else {
      files.push({ path: fullPath, relPath });
    }
  }
  return files;
}

function bundleProject() {
  const ignoreRules = parseGitignore(path.join(SRC_DIR, ".gitignore"));
  const files = collectFiles(SRC_DIR, SRC_DIR, ignoreRules);

  let bundle = "";

  for (const file of files) {
    const ext = path.extname(file.path);
    if (![".js", ".md"].includes(ext)) continue;

    const content = fs.readFileSync(file.path, "utf-8");

    bundle += `\n\n// ===== FILE: ${file.relPath} =====\n`;
    bundle += content;
  }

  fs.writeFileSync(OUTPUT_FILE, bundle, "utf-8");
  console.log(`✅ Project bundled to ${OUTPUT_FILE}`);
}

bundleProject();
