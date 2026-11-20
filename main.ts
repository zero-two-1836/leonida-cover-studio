// Leonida Cover Studio — entry program for gta6-cover-art-01.
//
// The app itself is the static site in app/ (open app/index.html in a
// browser; it runs offline). This program is the hand-in: it copies app/
// and screenshots/ into the output directory and writes dossier.json
// there with the vendored make.fun library, byte for byte the way the
// scorer rebuilds it. Node 22, standard library only, no network.
//
// Run it the way the grader does, with MAKEFUN_OUTPUT_DIR standing in
// for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The scorer's published caps for this bounty, handed to buildDossier so
// an entry the scorer would refuse is refused here first: dossier text,
// screenshot count and size, app file count, bytes and path length.
const GATE_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function handIn() {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  mkdirSync(outputDir, { recursive: true });
  copyTree(join(repoRoot, 'app'), join(outputDir, 'app'));
  const shotsDir = join(repoRoot, 'screenshots');
  if (existsSync(shotsDir)) {
    copyTree(shotsDir, join(outputDir, 'screenshots'));
  }

  // Fail loudly rather than hand in an empty shell: the app's page and
  // at least one screenshot have to be in the output before the dossier
  // is worth writing.
  if (!existsSync(join(outputDir, 'app', 'index.html'))) {
    throw new Error('hand-in aborted: app/index.html missing from the output');
  }
  if (!existsSync(join(outputDir, 'screenshots'))) {
    throw new Error('hand-in aborted: screenshots/ missing from the output');
  }

  const dossier = buildDossier(outputDir, GATE_LIMITS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log(`Leonida Cover Studio handed in: dossier.json (${dossier.length} bytes) written to ${outputDir}`);
}

handIn();
