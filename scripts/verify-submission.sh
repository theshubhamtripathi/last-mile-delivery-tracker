#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# verify-submission.sh — the submission guidelines encoded as an executable gate.
# Run by `npm run verify` before every push, and once more before submitting.
# Exits non-zero and prints the first failing rule. Typecheck/lint/test/build
# are run by the `verify` npm script; this file owns the hygiene rules.
# ---------------------------------------------------------------------------
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() { printf '\033[0;31m[verify] FAIL:\033[0m %s\n' "$1" >&2; exit 1; }
ok()   { printf '\033[0;32m[verify] ok:\033[0m %s\n' "$1"; }

IN_GIT=0
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then IN_GIT=1; fi

# --- 1. No forbidden paths tracked -----------------------------------------
if [ "$IN_GIT" -eq 1 ]; then
  FORBIDDEN='(^|/)(node_modules|dist|build|out|\.next|coverage|\.vscode|\.idea|\.claude)/|(^|/)\.env($|\.)|(^|/)CLAUDE\.md$|\.log$|(^|/)\.DS_Store$'
  # .env.example is explicitly allowed; exclude it before matching.
  TRACKED_BAD="$(git ls-files | grep -v '^\.env\.example$' | grep -E "$FORBIDDEN" || true)"
  if [ -n "$TRACKED_BAD" ]; then
    fail "forbidden files are tracked:\n$TRACKED_BAD"
  fi
  ok "no forbidden files tracked"
fi

# --- 2. Branch is main, no stray unmerged feat/* ---------------------------
if [ "$IN_GIT" -eq 1 ]; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$BRANCH" != "main" ]; then
    fail "current branch is '$BRANCH', must be 'main' for submission"
  fi
  ok "on branch main"
fi

# --- 3. No AI / co-author attribution in history ---------------------------
if [ "$IN_GIT" -eq 1 ] && git rev-parse HEAD >/dev/null 2>&1; then
  if git log --format='%B%an%ae' | grep -iE 'co-authored-by|generated with|claude|copilot|chatgpt' >/dev/null; then
    fail "AI/co-author attribution found in git history"
  fi
  ok "no AI attribution in history"

  # --- 4. Single author identity -------------------------------------------
  AUTHORS="$(git log --format='%an <%ae>' | sort -u)"
  if [ "$(printf '%s\n' "$AUTHORS" | grep -c .)" -gt 1 ]; then
    fail "more than one author identity in history:\n$AUTHORS"
  fi
  ok "single author identity"
fi

# --- 5. Repo size + no oversized files -------------------------------------
if [ "$IN_GIT" -eq 1 ] && [ -d .git ]; then
  GIT_KB="$(du -sk .git | cut -f1)"
  if [ "$GIT_KB" -gt 25600 ]; then
    fail ".git is ${GIT_KB}KB, exceeds 25MB budget"
  fi
  ok ".git under 25MB (${GIT_KB}KB)"
  BIG="$(git ls-files | while read -r f; do
    [ -f "$f" ] || continue
    sz=$(wc -c < "$f")
    [ "$sz" -gt 1048576 ] && echo "$f ($sz bytes)"
  done)"
  [ -n "$BIG" ] && fail "files exceed 1MB:\n$BIG"
  ok "no tracked file over 1MB"
fi

# --- 6. No leftover TODO/FIXME/not-implemented in shipped code --------------
if [ -d apps ] || [ -d packages ]; then
  LEFTOVERS="$(grep -RInE 'TODO|FIXME|not implemented' apps packages 2>/dev/null \
    --include='*.ts' --include='*.tsx' | grep -v -- '__tests__' || true)"
  if [ -n "$LEFTOVERS" ]; then
    fail "leftover TODO/FIXME/not-implemented:\n$LEFTOVERS"
  fi
  ok "no leftover TODO/FIXME markers"
fi

# --- 7. system-design.md under 800 words -----------------------------------
SD="docs/system-design.md"
if [ -f "$SD" ]; then
  WORDS="$(wc -w < "$SD" | tr -d ' ')"
  if [ "$WORDS" -gt 800 ]; then
    fail "docs/system-design.md is $WORDS words, exceeds 800"
  fi
  ok "system-design.md within 800 words ($WORDS)"
fi

printf '\033[0;32m[verify] all submission-hygiene checks passed.\033[0m\n'
