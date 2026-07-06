#!/usr/bin/env node
'use strict';
/**
 * Stack detection for guardrails init. Reads marker files in a project root and
 * reports the stack + frameworks, so init-guards knows which adapter to apply.
 *
 * Usage: node detect.js [projectDir]   → prints JSON to stdout.
 * Pure and side-effect-free (only reads). Never throws — worst case returns generic.
 */

const fs = require('node:fs');
const path = require('node:path');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function exists(file) {
  try {
    fs.accessSync(file);
    return true;
  } catch {
    return false;
  }
}

/** Detect the stack of a project directory. Returns { stack, frameworks, markers }. */
function detect(projectDir) {
  const root = projectDir || process.cwd();
  const markers = [];
  const frameworks = [];

  const pkgPath = path.join(root, 'package.json');
  const pkg = readJson(pkgPath);
  if (pkg) {
    markers.push('package.json');
    const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
    const hasTs = Boolean(deps.typescript) || exists(path.join(root, 'tsconfig.json'));
    if (deps.next) frameworks.push('nextjs');
    if (deps.react) frameworks.push('react');
    if (deps.express) frameworks.push('express');
    if (deps.fastify) frameworks.push('fastify');
    if (deps['@trpc/server']) frameworks.push('trpc');
    if (deps.prisma || deps['@prisma/client']) frameworks.push('prisma');

    let stack = hasTs ? 'ts-node' : 'node';
    if (frameworks.includes('nextjs')) stack = 'nextjs';
    return { stack, frameworks, markers, hasTypeScript: hasTs };
  }

  if (exists(path.join(root, 'pyproject.toml'))) markers.push('pyproject.toml');
  if (exists(path.join(root, 'requirements.txt'))) markers.push('requirements.txt');
  if (exists(path.join(root, 'setup.py'))) markers.push('setup.py');
  if (markers.length) return { stack: 'python', frameworks, markers, hasTypeScript: false };

  if (exists(path.join(root, 'go.mod'))) return { stack: 'go', frameworks, markers: ['go.mod'], hasTypeScript: false };
  if (exists(path.join(root, 'Cargo.toml'))) return { stack: 'rust', frameworks, markers: ['Cargo.toml'], hasTypeScript: false };

  return { stack: 'generic', frameworks, markers, hasTypeScript: false };
}

module.exports = { detect };

if (require.main === module) {
  const dir = process.argv[2] || process.cwd();
  process.stdout.write(JSON.stringify(detect(dir), null, 2) + '\n');
}
