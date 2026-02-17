#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const args = process.argv.slice(2);
const wantsFix = args.includes('--fix');
const explicitFiles = args.filter((a) => a !== '--fix');

const LINT_EXTENSIONS = new Set(['.ts', '.tsx']);

function isLintable(filePath) {
  return LINT_EXTENSIONS.has(path.extname(filePath));
}

function runGit(cmd) {
  return execSync(cmd, { encoding: 'utf8' });
}

function normalizeFile(filePath) {
  return filePath.replace(/\\/g, '/');
}

function getUntrackedFiles() {
  const out = runGit('git ls-files --others --exclude-standard');
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizeFile)
    .filter(isLintable);
}

function parseChangedLineMapFromDiff(diffText) {
  const changed = new Map();
  let currentFile = null;

  for (const rawLine of diffText.split('\n')) {
    const line = rawLine.trimEnd();

    if (line.startsWith('+++ b/')) {
      const file = normalizeFile(line.slice(6));
      currentFile = isLintable(file) ? file : null;
      continue;
    }

    if (!currentFile) continue;

    const hunk = /^@@\s+-(?:\d+)(?:,\d+)?\s+\+(\d+)(?:,(\d+))?\s+@@/.exec(line);
    if (!hunk) continue;

    const start = Number(hunk[1]);
    const count = hunk[2] ? Number(hunk[2]) : 1;
    const end = count === 0 ? start : start + count - 1;

    if (!changed.has(currentFile)) changed.set(currentFile, []);
    changed.get(currentFile).push([start, end]);
  }

  return changed;
}

function getChangedLineMap() {
  const diffText = runGit('git diff --unified=0 --no-color HEAD -- .');
  return parseChangedLineMapFromDiff(diffText);
}

function getAllChangedFiles(changedLineMap, untrackedFiles) {
  const files = new Set([...changedLineMap.keys(), ...untrackedFiles]);
  if (explicitFiles.length > 0) {
    return explicitFiles
      .map(normalizeFile)
      .filter((file) => files.has(file));
  }
  return Array.from(files);
}

function lineInRanges(line, ranges) {
  if (!Number.isFinite(line) || line <= 0) return false;
  return ranges.some(([start, end]) => line >= start && line <= end);
}

function messageTouchesChangedLines(message, ranges) {
  if (lineInRanges(message.line, ranges)) return true;
  if (lineInRanges(message.endLine, ranges)) return true;
  return false;
}

function runEslint(files) {
  const eslintArgs = [...files, '--format', 'json'];
  if (wantsFix) eslintArgs.unshift('--fix');

  const result = spawnSync('npx', ['eslint', ...eslintArgs], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  return result;
}

function relativePathFromAbs(absPath) {
  return normalizeFile(path.relative(process.cwd(), absPath));
}

function printMessage(file, msg) {
  const level = msg.severity === 2 ? 'error' : 'warn';
  const rule = msg.ruleId || 'unknown-rule';
  const line = msg.line || 0;
  const col = msg.column || 0;
  console.log(`${file}:${line}:${col}  ${level}  ${msg.message}  ${rule}`);
}

function main() {
  let changedLineMap;
  let untrackedFiles;

  try {
    changedLineMap = getChangedLineMap();
    untrackedFiles = getUntrackedFiles();
  } catch (error) {
    console.error('[lint:changed] Failed to detect changed files:', error.message || error);
    process.exit(1);
  }

  for (const file of untrackedFiles) {
    if (!changedLineMap.has(file)) changedLineMap.set(file, [[1, Number.MAX_SAFE_INTEGER]]);
  }

  const files = getAllChangedFiles(changedLineMap, untrackedFiles);

  if (files.length === 0) {
    console.log('[lint:changed] No changed TS/TSX files.');
    process.exit(0);
  }

  const eslintResult = runEslint(files);
  const stdout = (eslintResult.stdout || '').trim();
  const stderr = (eslintResult.stderr || '').trim();

  if (!stdout) {
    if (stderr) console.error(stderr);
    process.exit(eslintResult.status ?? 1);
  }

  let report;
  try {
    report = JSON.parse(stdout);
  } catch (error) {
    if (stdout) process.stdout.write(`${stdout}\n`);
    if (stderr) process.stderr.write(`${stderr}\n`);
    process.exit(eslintResult.status ?? 1);
  }

  const scopedMessages = [];

  for (const fileResult of report) {
    const relFile = relativePathFromAbs(fileResult.filePath);
    const ranges = changedLineMap.get(relFile);
    if (!ranges || ranges.length === 0) continue;

    for (const msg of fileResult.messages || []) {
      if (!messageTouchesChangedLines(msg, ranges)) continue;
      scopedMessages.push({ file: relFile, message: msg });
    }
  }

  if (scopedMessages.length === 0) {
    console.log(`[lint:changed] Clean on changed lines (${files.length} files checked).`);
    process.exit(0);
  }

  let errorCount = 0;
  let warningCount = 0;

  for (const item of scopedMessages) {
    printMessage(item.file, item.message);
    if (item.message.severity === 2) errorCount += 1;
    if (item.message.severity === 1) warningCount += 1;
  }

  console.log(`\n[lint:changed] Found ${errorCount} error(s), ${warningCount} warning(s) on changed lines.`);

  if (stderr) process.stderr.write(`${stderr}\n`);

  process.exit(errorCount > 0 ? 1 : 0);
}

main();
