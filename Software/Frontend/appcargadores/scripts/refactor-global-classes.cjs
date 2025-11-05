const fs = require('fs');
const path = require('path');

// Mapping of long Tailwind sequences to helper classes
const replacements = [
  // Modal overlays
  {
    pattern: /className="fixed inset-0 z-\[9999\] flex items-center justify-center bg-black\/50"/g,
    replacement: 'className="modal-overlay"'
  },
  {
    pattern: /className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black\/60 backdrop-blur-sm"/g,
    replacement: 'className="modal-overlay-dark"'
  },
  // Form labels
  {
    pattern: /className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"/g,
    replacement: 'className="form-label-md-alt"'
  },
  {
    pattern: /className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"/g,
    replacement: 'className="form-label"'
  },
  {
    pattern: /className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"/g,
    replacement: 'className="flex items-center gap-2 form-label"'
  },
  {
    pattern: /className="text-sm font-medium text-gray-700 dark:text-gray-300"/g,
    replacement: 'className="form-label"'
  },
  // Modal content text
  {
    pattern: /className="p-6 text-gray-700 dark:text-gray-200"/g,
    replacement: 'className="modal-content-text"'
  },
  // Headings
  {
    pattern: /className="text-2xl font-semibold text-gray-900 dark:text-gray-100"/g,
    replacement: 'className="heading-page-2xl"'
  },
  {
    pattern: /className="text-3xl font-bold text-gray-900 dark:text-gray-100"/g,
    replacement: 'className="heading-page-3xl"'
  },
  {
    pattern: /className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white"/g,
    replacement: 'className="auth-title"'
  },
  // Layout containers
  {
    pattern: /className="flex min-h-screen bg-gray-100 dark:bg-gray-900 lg:pl-64"/g,
    replacement: 'className="main-layout"'
  },
  {
    pattern: /className="flex items-center justify-end px-4 pt-4 sm:px-6"/g,
    replacement: 'className="header-actions"'
  },
  {
    pattern: /className="section-header flex justify-between items-center bg-gray-100 dark:bg-gray-800"/g,
    replacement: 'className="section-header-flex"'
  },
  {
    pattern: /className="screen-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8"/g,
    replacement: 'className="auth-screen"'
  },
  // Text variants
  {
    pattern: /className="text-sm text-gray-600 dark:text-gray-400"/g,
    replacement: 'className="text-sm-gray"'
  },
  {
    pattern: /className="text-xs text-gray-500 dark:text-gray-500"/g,
    replacement: 'className="text-xs-muted"'
  },
  {
    pattern: /className="text-sm text-gray-500 dark:text-gray-400"/g,
    replacement: 'className="text-secondary"'
  },
  {
    pattern: /className="text-sm text-red-600 dark:text-red-400"/g,
    replacement: 'className="text-sm-red"'
  },
  {
    pattern: /className="font-medium text-gray-800 dark:text-gray-100"/g,
    replacement: 'className="item-title-md"'
  },
  {
    pattern: /className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium"/g,
    replacement: 'className="text-xs-indigo"'
  },
  {
    pattern: /className="text-xs text-gray-400 dark:text-gray-500 mt-1"/g,
    replacement: 'className="text-xs-muted mt-1"'
  },
  {
    pattern: /className="text-xs text-gray-600 dark:text-gray-400"/g,
    replacement: 'className="text-xs-gray"'
  },
  // Table helpers
  {
    pattern: /className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-100"/g,
    replacement: 'className="table-full-divided"'
  },
  {
    pattern: /className="bg-gray-50 dark:bg-gray-700"/g,
    replacement: 'className="thead-gray"'
  },
  {
    pattern: /className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300"/g,
    replacement: 'className="th-left"'
  },
  {
    pattern: /className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-300"/g,
    replacement: 'className="th-center"'
  },
  {
    pattern: /className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"/g,
    replacement: 'className="tbody-default"'
  },
  // Icon helpers
  {
    pattern: /className="fas fa-shield-alt text-blue-600 dark:text-blue-400 text-2xl"/g,
    replacement: 'className="icon-xl-blue fas fa-shield-alt"'
  }
];

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const results = {};

  replacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      const key = replacement.match(/className="([^"]+)"/)[1];
      results[key] = (results[key] || 0) + matches.length;
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return { modified, results };
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      callback(filePath);
    }
  });
}

const srcDir = path.join(__dirname, '..', 'src');
let filesChanged = 0;
const totalResults = {};

console.log('Refactoring global Tailwind classes...\n');

walkDir(srcDir, filePath => {
  const { modified, results } = refactorFile(filePath);
  if (modified) {
    filesChanged++;
    console.log(`✓ ${path.relative(srcDir, filePath)}`);
    Object.entries(results).forEach(([helper, count]) => {
      totalResults[helper] = (totalResults[helper] || 0) + count;
    });
  }
});

console.log(`\n✓ Files changed: ${filesChanged}`);
console.log('\nReplacements made:');
Object.entries(totalResults)
  .sort((a, b) => b[1] - a[1])
  .forEach(([helper, count]) => {
    console.log(`  ${helper}: ${count}`);
  });
