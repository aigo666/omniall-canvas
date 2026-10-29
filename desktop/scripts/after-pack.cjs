const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

async function afterPack(context) {
  const desktopDir = path.join(__dirname, "..");
  const webSrc = path.join(desktopDir, "resources", "web");
  const agentSrc = path.join(desktopDir, "resources", "agent");
  if (!fs.existsSync(path.join(webSrc, "server.js"))) {
    throw new Error(`missing desktop web resources: ${webSrc}`);
  }
  if (!fs.existsSync(path.join(agentSrc, "index.mjs"))) {
    throw new Error(`missing desktop agent resources: ${agentSrc}`);
  }

  const appName = context.packager.appInfo.productFilename;
  let resourcesDir;
  if (context.electronPlatformName === "darwin") {
    resourcesDir = path.join(context.appOutDir, `${appName}.app`, "Contents", "Resources");
  } else {
    resourcesDir = path.join(context.appOutDir, "resources");
  }
  const webDest = path.join(resourcesDir, "web");
  const agentDest = path.join(resourcesDir, "agent");

  fs.mkdirSync(resourcesDir, { recursive: true });
  execFileSync("rsync", ["-a", "--delete", `${webSrc}/`, `${webDest}/`], { stdio: "inherit" });
  execFileSync("rsync", ["-a", "--delete", `${agentSrc}/`, `${agentDest}/`], { stdio: "inherit" });
  if (!fs.existsSync(path.join(webDest, "node_modules", "next"))) {
    throw new Error(`afterPack sync failed, next missing under ${webDest}`);
  }
  if (!fs.existsSync(path.join(agentDest, "index.mjs"))) {
    throw new Error(`afterPack sync failed, agent missing under ${agentDest}`);
  }
  console.log(`afterPack: synced web resources -> ${webDest}`);
  console.log(`afterPack: synced agent resources -> ${agentDest}`);
}

module.exports = afterPack;
module.exports.default = afterPack;
