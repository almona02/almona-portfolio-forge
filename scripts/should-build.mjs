#!/usr/bin/env node
// Skip build on Vercel if only docs or markdown changed
import { execSync } from 'node:child_process'

try {
  const base = process.env.VERCEL_GIT_PREVIOUS_SHA || 'origin/main'
  const head = process.env.VERCEL_GIT_COMMIT_SHA || 'HEAD'
  const diff = execSync(`git diff --name-only ${base}...${head}`, { stdio: ['ignore','pipe','ignore'] }).toString()
  const files = diff.split('\n').filter(Boolean)
  const shouldBuild = files.some(f => !/^(README\.md|.*\.md|docs\/|\.github\/|\.vscode\/)/.test(f))
  process.exit(shouldBuild ? 1 : 0)
} catch {
  // If in doubt, build
  process.exit(1)
}


