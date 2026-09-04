#!/usr/bin/env node

"use strict";

const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

const manifestPaths = [
  "plugin.json",
  ".codex-plugin/plugin.json",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
];

function readManifestVersion(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return manifest.version ?? manifest.plugins?.[0]?.version;
}

// This fork has no release tags yet (pre-first-release). Fall back to
// checking the manifests agree with each other instead of crashing on
// `git describe` finding nothing to describe. Once a `v*` tag exists,
// this goes back to enforcing manifest-version == latest-tag.
let expectedVersion;
try {
  expectedVersion = execFileSync(
    "git",
    ["describe", "--tags", "--abbrev=0"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();
} catch {
  expectedVersion = null;
}

const versions = manifestPaths.map((manifestPath) => [manifestPath, readManifestVersion(manifestPath)]);

if (expectedVersion) {
  for (const [manifestPath, version] of versions) {
    if (version !== expectedVersion) {
      throw new Error(
        `${manifestPath} has version ${version ?? "<missing>"}; expected ${expectedVersion} (latest git tag)`,
      );
    }
  }
  console.log(`All plugin manifests use version ${expectedVersion}.`);
} else {
  const [firstPath, firstVersion] = versions[0];
  for (const [manifestPath, version] of versions) {
    if (version !== firstVersion) {
      throw new Error(
        `${manifestPath} has version ${version ?? "<missing>"}; expected ${firstVersion ?? "<missing>"} (to match ${firstPath}) — no git tags exist yet, so manifests are checked against each other`,
      );
    }
  }
  console.log(`No git tags yet — all plugin manifests agree on version ${firstVersion}.`);
}
