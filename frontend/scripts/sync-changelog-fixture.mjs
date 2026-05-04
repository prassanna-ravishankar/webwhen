// Copies backend/static/changelog.json into the frontend build context as
// .changelog-fixture.json so scripts/prerender.mjs can bake article-level
// JSON-LD into dist/changelog.html. The fixture is gitignored; CI also runs
// this step (or an equivalent cp) before `docker build` because the frontend
// image build context is just `frontend/` and cannot reach `../backend/`.
//
// Missing fixture is non-fatal: prerender falls back to an empty entries list,
// which produces the CollectionPage shell without TechArticle items, matching
// pre-fix behaviour.
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = join(import.meta.dirname, '..');
const SRC = join(PROJECT_ROOT, '..', 'backend', 'static', 'changelog.json');
const DEST = join(PROJECT_ROOT, '.changelog-fixture.json');

if (!existsSync(SRC)) {
  console.warn(`[sync-changelog-fixture] source missing at ${SRC}; skipping. ` +
    `Prerendered /changelog will not include article-level JSON-LD.`);
  process.exit(0);
}

copyFileSync(SRC, DEST);
console.log(`[sync-changelog-fixture] ${SRC} → ${DEST}`);
