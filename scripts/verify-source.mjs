import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

const root = process.cwd();
const sourceRoot = join(root, 'src');
const errors = [];
const metrics = { files: 0, imports: 0, buttons: 0, externalLinks: 0, javascriptChecked: 0 };

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function relativeTargetExists(file, specifier) {
  const target = resolve(dirname(file), specifier);
  if (existsSync(target)) return true;
  return ['.js', '.jsx', '.mjs', '.json'].some((extension) => existsSync(`${target}${extension}`))
    || ['index.js', 'index.jsx', 'index.mjs'].some((name) => existsSync(join(target, name)));
}

const requiredFiles = [
  'index.html', 'package.json', 'vite.config.js',
  'src/main.jsx', 'src/App.jsx', 'src/data/storage.js', 'src/styles.css',
];
for (const file of requiredFiles) if (!existsSync(join(root, file))) errors.push(`Missing required file: ${file}`);

const files = walk(sourceRoot).filter((file) => ['.js', '.jsx', '.mjs'].includes(extname(file)));
metrics.files = files.length;

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const display = file.slice(root.length + 1);

  for (const match of source.matchAll(/(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g)) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) continue;
    metrics.imports += 1;
    if (!relativeTargetExists(file, specifier)) errors.push(`${display}: missing relative import ${specifier}`);
  }

  for (const match of source.matchAll(/<button\b([^>]*)>/gs)) {
    metrics.buttons += 1;
    if (!/\btype\s*=/.test(match[1])) errors.push(`${display}: button is missing an explicit type`);
  }

  for (const match of source.matchAll(/<a\b([^>]*)target=["']_blank["']([^>]*)>/gs)) {
    metrics.externalLinks += 1;
    const attributes = `${match[1]} ${match[2]}`;
    if (!/rel=["'][^"']*noopener[^"']*noreferrer[^"']*["']/.test(attributes)) {
      errors.push(`${display}: target="_blank" link must include rel="noopener noreferrer"`);
    }
  }

  if (/\bwindow\.(alert|confirm)\s*\(/.test(source)) errors.push(`${display}: native alert/confirm is not allowed`);
  if (/href=\{[^}]*resourceUrl[^}]*\}/.test(source) && !source.includes('isSafeResourceUrl')) {
    errors.push(`${display}: resource URL is rendered without the shared safety validator`);
  }

  if (extname(file) === '.js' || extname(file) === '.mjs') {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
      metrics.javascriptChecked += 1;
    } catch (error) {
      errors.push(`${display}: ${String(error.stderr || error.message).trim()}`);
    }
  }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (packageJson.version !== '2.0.1') errors.push('package.json must identify the stable 2.0.1 contrast patch release');
if (packageJson.scripts?.['verify:source'] === undefined) {
  errors.push('package.json is missing verify:source');
}

if (errors.length) {
  console.error(`LifeOS source verification failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('LifeOS source verification passed.');
console.log(JSON.stringify(metrics, null, 2));
