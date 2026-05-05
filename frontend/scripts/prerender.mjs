import { chromium } from 'playwright';
import handler from 'serve-handler';
import http from 'node:http';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { loadTsModule } from './_lib/load-ts.mjs';

const PROJECT_ROOT = join(import.meta.dirname, '..');
const DIST = join(PROJECT_ROOT, 'dist');
const PORT = 4567;
// Origin baked into JSON-LD URL fields, RSS alternate links, etc. for the
// prerendered HTML. Production defaults to webwhen.ai; staging/preview CI
// jobs override via PRERENDER_ORIGIN so a build for staging.webwhen.ai
// doesn't ship HTML pointing crawlers at production.
const PRERENDER_ORIGIN = process.env.PRERENDER_ORIGIN || 'https://webwhen.ai';

// Synced from backend/static/changelog.json by scripts/sync-changelog-fixture.mjs
// (npm `prebuild`). Lives inside the frontend build context so `docker build`
// — which cannot see `../backend/` — still bakes article-level JSON-LD into
// dist/changelog.html. CI mirrors the host copy step before the docker build.
const CHANGELOG_FIXTURE = join(PROJECT_ROOT, '.changelog-fixture.json');
let changelogEntries = [];
if (existsSync(CHANGELOG_FIXTURE)) {
  try {
    changelogEntries = JSON.parse(readFileSync(CHANGELOG_FIXTURE, 'utf-8'));
  } catch (err) {
    console.warn(`  [warn] could not parse ${CHANGELOG_FIXTURE}: ${err.message}`);
  }
} else {
  console.warn(`  [warn] ${CHANGELOG_FIXTURE} missing; /changelog JSON-LD will lack article items`);
}

// Ensure config.js exists (normally injected at runtime by nginx)
const configPath = join(DIST, 'config.js');
if (!existsSync(configPath)) {
  writeFileSync(configPath, 'window.CONFIG = {};', 'utf-8');
}

// Snapshot the original SPA shell BEFORE any prerender runs. Once we start
// writing route outputs, `/` writes back to `dist/index.html`, clobbering
// the empty-root shell. Subsequent route passes would then load the
// populated `/` HTML, see `root.children.length > 0` in main.tsx, call
// `hydrateRoot()` against the previous route's DOM, and emit React #418/#423
// on every pass after the first. Real users never hit this — they get the
// per-route .html with matching content. Serve the in-memory shell for any
// rewritten path so each pass starts against an empty root. See #299.
const SHELL_HTML = readFileSync(join(DIST, 'index.html'), 'utf-8');

// Serve dist/ on a local port. SPA-rewrite paths (anything that would
// otherwise fall back to /index.html) get the original shell from memory.
// Real assets pass through to serve-handler.
const ASSET_PATH = /\.[a-zA-Z0-9]+$/; // any path ending in an extension is a real file
const server = http.createServer((req, res) => {
  const url = req.url || '/';
  if (url === '/' || url === '/index.html' || !ASSET_PATH.test(url.split('?')[0])) {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(SHELL_HTML);
    return;
  }
  handler(req, res, { public: DIST });
});

const [{ PUBLIC_ROUTES }, browser] = await Promise.all([
  loadTsModule(join(PROJECT_ROOT, 'src/data/publicRoutes.ts')),
  chromium.launch(),
  new Promise((resolve) => server.listen(PORT, resolve)),
]);
const ROUTES = PUBLIC_ROUTES.map((r) => r.path);

console.log(`Prerendering ${ROUTES.length} routes...`);

const context = await browser.newContext();

// Bypass auth during prerendering, and seed build-time fixtures the React
// tree consumes synchronously so route HTML bakes in JSON-LD that would
// otherwise depend on a runtime fetch (e.g. /changelog).
await context.addInitScript(
  ([entries, origin]) => {
    window.__PRERENDER__ = true;
    window.__PRERENDER_ORIGIN__ = origin;
    window.__PRERENDER_CHANGELOG__ = entries;
  },
  [changelogEntries, PRERENDER_ORIGIN],
);

let failed = 0;

for (const route of ROUTES) {
  const page = await context.newPage();

  page.on('pageerror', (err) => console.error(`  [error] ${route}: ${err.message}`));

  await page.goto(`http://localhost:${PORT}${route}`, {
    waitUntil: 'networkidle',
  });

  try {
    await page.waitForSelector('nav, main, h1', { timeout: 15000 });
  } catch {
    const bodyHTML = await page.evaluate(() => document.body.innerHTML.slice(0, 300));
    console.error(`  SKIP ${route} (render failed). Body: ${bodyHTML}`);
    failed++;
    await page.close();
    continue;
  }

  // Strip prerender globals from output HTML so they don't affect real users
  await page.evaluate(() => {
    delete window.__PRERENDER__;
    delete window.__PRERENDER_ORIGIN__;
    delete window.__PRERENDER_CHANGELOG__;
  });

  const html = await page.content();
  const outPath =
    route === '/'
      ? join(DIST, 'index.html')
      : join(DIST, `${route.slice(1)}.html`);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, 'utf-8');
  console.log(`  OK ${route}`);

  await page.close();
}

await browser.close();
server.close();

if (failed > 0) {
  console.error(`Prerendering done with ${failed} failures.`);
  process.exit(1);
}

// Contract assertion: /changelog must ship article-level JSON-LD or the whole
// reason this script seeds __PRERENDER_CHANGELOG__ has silently regressed.
// Catches both fixture-missing-in-CI (the original #261 trap) and
// React-tree-stopped-emitting (someone refactors Changelog.tsx and breaks the
// seeded init path). Skipped when /changelog isn't in ROUTES.
if (ROUTES.includes('/changelog')) {
  const changelogHtml = readFileSync(join(DIST, 'changelog.html'), 'utf-8');
  const articleCount = (changelogHtml.match(/"@type":\s*"TechArticle"/g) ?? []).length;
  if (articleCount < 1) {
    console.error(
      'Prerender postcondition failed: dist/changelog.html contains 0 TechArticle items. ' +
      'Expected article-level JSON-LD seeded from .changelog-fixture.json. See #261.',
    );
    process.exit(1);
  }
  console.log(`  postcondition OK: /changelog has ${articleCount} TechArticle items`);
}

console.log('Prerendering complete.');
