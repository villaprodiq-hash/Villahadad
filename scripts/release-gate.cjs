#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const cliArgs = new Set(process.argv.slice(2));

const shouldRunTests = !cliArgs.has('--skip-tests');
const shouldRunE2E = cliArgs.has('--e2e');
const shouldRunChangedLint = cliArgs.has('--changed');

const reportDir = path.join(projectRoot, 'reports');
const reportPath = path.join(reportDir, 'release-gate-latest.md');

function timestamp() {
  return new Date().toISOString();
}

function runStep(step) {
  const startedAt = Date.now();
  console.log(`\n[release-gate] ▶ ${step.name}`);

  const result = spawnSync(step.cmd, step.args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  const durationMs = Date.now() - startedAt;
  const passed = (result.status ?? 1) === 0;

  console.log(
    `[release-gate] ${passed ? '✅ PASS' : '❌ FAIL'} ${step.name} (${(
      durationMs / 1000
    ).toFixed(2)}s)`
  );

  return {
    ...step,
    passed,
    durationMs,
    exitCode: result.status ?? 1,
  };
}

function writeReport(results, totalMs) {
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const lines = [
    '# Release Gate Report',
    '',
    `- Generated: ${timestamp()}`,
    `- Total Duration: ${(totalMs / 1000).toFixed(2)}s`,
    `- Overall: ${results.every((r) => r.passed) ? 'PASS' : 'FAIL'}`,
    '',
    '## Steps',
    '',
    ...results.map(
      (r) =>
        `- ${r.passed ? '✅' : '❌'} ${r.name} | exit=${r.exitCode} | ${(
          r.durationMs / 1000
        ).toFixed(2)}s`
    ),
    '',
    '## Flags',
    '',
    `- skip-tests: ${String(!shouldRunTests)}`,
    `- e2e: ${String(shouldRunE2E)}`,
    `- changed-lint: ${String(shouldRunChangedLint)}`,
    '',
  ];

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`[release-gate] 📝 Report written to ${reportPath}`);
}

const steps = [
  { name: 'Type Check', cmd: 'npm', args: ['run', 'typecheck'] },
  {
    name: shouldRunChangedLint ? 'Lint (Changed Files)' : 'Lint (Full)',
    cmd: 'npm',
    args: ['run', shouldRunChangedLint ? 'lint:changed' : 'lint'],
  },
  { name: 'Production Build', cmd: 'npm', args: ['run', 'build'] },
];

if (shouldRunTests) {
  steps.push({ name: 'Unit Tests', cmd: 'npm', args: ['run', 'test'] });
}

if (shouldRunE2E) {
  steps.push({ name: 'E2E (Playwright)', cmd: 'npx', args: ['playwright', 'test'] });
}

const gateStartedAt = Date.now();
const results = [];

for (const step of steps) {
  const stepResult = runStep(step);
  results.push(stepResult);

  if (!stepResult.passed) {
    break;
  }
}

const totalMs = Date.now() - gateStartedAt;
writeReport(results, totalMs);

const hasFailure = results.some((r) => !r.passed);
if (hasFailure) {
  console.error('[release-gate] ❌ Gate failed. Fix issues before deploy.');
  process.exit(1);
}

console.log('[release-gate] ✅ All checks passed. Safe for release gating.');
