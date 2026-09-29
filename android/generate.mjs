// Generates the Android app (a Trusted Web Activity: the website, full screen,
// in Chrome) from twa-manifest.json, using Google's Bubblewrap. Run by the
// Android workflow; the version comes from the release tag.
//
//   node android/generate.mjs <version> <output-folder>
//   e.g. node android/generate.mjs v0.1.0 android/project
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import bubblewrap from "@bubblewrap/core";

const { TwaManifest, TwaGenerator, ConsoleLog } = bubblewrap;

const [tag = "v0.0.0", out = "android/project"] = process.argv.slice(2);
const version = tag.replace(/^v/, "");
const [major = 0, minor = 0, patch = 0] = version.split(/[.-]/).map((n) => Number.parseInt(n, 10) || 0);

const json = JSON.parse(await readFile(new URL("./twa-manifest.json", import.meta.url), "utf8"));
json.appVersion = version;
// Android needs a whole number that grows with every release: 0.1.0 -> 100, 1.2.3 -> 10203.
json.appVersionCode = Math.max(1, major * 10000 + minor * 100 + patch);

await new TwaGenerator().createTwaProject(resolve(out), new TwaManifest(json), new ConsoleLog("android"));
console.log(`Generated ${json.packageId} ${json.appVersion} (${json.appVersionCode}) in ${out}`);
