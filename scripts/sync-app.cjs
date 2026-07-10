const fs = require("fs");
const path = require("path");

const deployRoot = path.resolve(__dirname, "..");
const sourceRoot = path.resolve(deployRoot, "..");
const publicRoot = path.join(deployRoot, "public");

function copyFile(relativePath) {
  const source = path.join(sourceRoot, relativePath);
  const target = path.join(publicRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(relativePath) {
  const source = path.join(sourceRoot, relativePath);
  const target = path.join(publicRoot, relativePath);
  fs.cpSync(source, target, { recursive: true, force: true });
}

copyFile("index.html");
copyFile("app.js");
copyFile("styles.css");
copyDirectory("palettes");

console.log("小麦拼豆网页资源已同步。");
