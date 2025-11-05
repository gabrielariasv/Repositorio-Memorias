/*
  Refactor long Tailwind class sequences to project UI helper classes.
  Safe, idempotent, file-in-place rewrite for .tsx files under src/.
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/**
 * Replacement rules
 * Each rule: { name, test, replace }
 * - test: RegExp (global) or string to search
 * - replace: string replacement
 * Order matters (more specific first)
 */
const RULES = [
  {
    name: 'scroll-table',
    test: /max-h-96\s+overflow-y-auto\s+scrollbar-thin\s+scrollbar-thumb-gray-300\s+scrollbar-track-gray-100\s+dark:scrollbar-thumb-cyan-400\s+dark:scrollbar-track-gray-800/g,
    replace: 'scroll-table',
  },
  {
    name: 'table-base+divide',
    test: /min-w-full\s+divide-y\s+divide-gray-200\s+text-gray-800\s+dark:divide-gray-700\s+dark:text-gray-100/g,
    replace: 'table-base table-divide-y',
  },
  {
    name: 'heading-xl',
    test: /mb-3\s+text-3xl\s+font-bold\s+text-gray-800\s+dark:text-gray-100/g,
    replace: 'heading-xl',
  },
  {
    name: 'heading-lg',
    test: /mb-4\s+text-xl\s+font-semibold\s+text-gray-800\s+dark:text-gray-100/g,
    replace: 'heading-lg',
  },
  {
    name: 'spinner-lg',
    test: /h-12\s+w-12\s+animate-spin\s+rounded-full\s+border-b-2\s+border-t-2\s+border-indigo-600/g,
    replace: 'spinner-lg',
  },
  {
    name: 'center-layout',
    test: /flex\s+h-full\s+min-h\[320px\]\s+items-center\s+justify-center\s+bg-gray-100\s+dark:bg-gray-900/g,
    replace: 'center-layout',
  },
  {
    name: 'reservation-card-indigo',
    test: /flex\s+items-center\s+rounded-lg\s+bg-indigo-50\s+p-5\s+shadow-sm\s+dark:bg-indigo-900\/60/g,
    replace: 'reservation-card-indigo',
  },
  {
    name: 'badge-in-progress',
    test: /mt-2\s+inline-block\s+rounded\s+bg-green-100\s+px-2\s+py-1\s+text-xs\s+font-semibold\s+text-green-700\s+dark:bg-green-800\s+dark:text-green-200/g,
    replace: 'badge-in-progress',
  },
  {
    name: 'text-secondary',
    test: /text-gray-600\s+dark:text-gray-300/g,
    replace: 'text-secondary',
  },
  {
    name: 'item-title',
    test: /font-semibold\s+text-gray-800\s+dark:text-gray-100/g,
    replace: 'item-title',
  },
  {
    name: 'th-spacious',
    test: /px-6\s+py-3\s+text-left\s+text-xs\s+font-medium\s+uppercase\s+tracking-wider\s+text-gray-500\s+dark:text-gray-300/g,
    replace: 'th-spacious',
  },
  {
    name: 'td-spacious-nowrap',
    test: /whitespace-nowrap\s+px-6\s+py-4/g,
    replace: 'td-spacious-nowrap',
  },
  {
    name: 'empty-card',
    test: /rounded-lg\s+border\s+border-dashed\s+border-gray-300\s+bg-white\s+p-6\s+text-center\s+text-gray-600\s+dark:border-gray-600\s+dark:bg-gray-800\s+dark:text-gray-300/g,
    replace: 'empty-card',
  },
];

/**
 * Recursively walk a directory and return all files with listed extensions
 */
function collectFiles(dir, exts = ['.tsx', '.ts', '.jsx']) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      // skip node_modules, dist, build
      if (/node_modules|dist|build/.test(ent.name)) continue;
      out.push(...collectFiles(full, exts));
    } else if (exts.includes(path.extname(ent.name))) {
      out.push(full);
    }
  }
  return out;
}

function applyRules(content) {
  let updated = content;
  const counts = {};
  for (const rule of RULES) {
    const before = updated;
    updated = updated.replace(rule.test, rule.replace);
    if (before !== updated) {
      // estimate count by executing regex on before-content
      if (rule.test instanceof RegExp) {
        const matches = before.match(rule.test);
        counts[rule.name] = (counts[rule.name] || 0) + (matches ? matches.length : 1);
      } else {
        counts[rule.name] = (counts[rule.name] || 0) + 1;
      }
    }
  }
  return { updated, counts };
}

function run() {
  const files = collectFiles(SRC, ['.tsx']);
  let totalFilesChanged = 0;
  const aggregate = {};

  for (const file of files) {
    // Skip styles
    if (file.includes(path.sep + 'styles' + path.sep)) continue;

    const src = fs.readFileSync(file, 'utf8');
    const { updated, counts } = applyRules(src);
    if (updated !== src) {
      fs.writeFileSync(file, updated, 'utf8');
      totalFilesChanged++;
      // aggregate counts
      for (const [k, v] of Object.entries(counts)) {
        aggregate[k] = (aggregate[k] || 0) + v;
      }
      console.log(`Refactored: ${path.relative(ROOT, file)} ->`, counts);
    }
  }

  console.log('\nSummary:');
  console.log(`  Files changed: ${totalFilesChanged}`);
  const keys = Object.keys(aggregate).sort();
  for (const k of keys) {
    console.log(`  ${k}: ${aggregate[k]}`);
  }
  if (totalFilesChanged === 0) {
    console.log('No changes detected.');
  }
}

run();
