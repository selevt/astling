#!/usr/bin/env bash
# Bootstrap a local test git repository for development.
# Run from the project root: bash scripts/setup-test-repo.sh

set -euo pipefail

REPO_DIR="test-repo"

if [ -d "$REPO_DIR/.git" ]; then
  echo "test-repo already exists — skipping. Remove it first to recreate."
  exit 0
fi

rm -rf "$REPO_DIR"
mkdir "$REPO_DIR"
cd "$REPO_DIR"
git init

# Helper to create a file and commit
commit() {
  local file=$1 msg=$2
  mkdir -p "$(dirname "$file")"
  echo "// $msg" > "$file"
  git add "$file"
  git commit -m "$msg" --quiet
}

# --- main branch ---
commit "README.md" "initial commit"

# --- feature/auth (branches from commit 1) ---
git checkout -b feature/auth --quiet
commit "src/login.ts" "add login page"

# --- feature/dashboard (branches from feature/auth HEAD) ---
git checkout -b feature/dashboard --quiet
commit "src/dashboard.ts" "add dashboard layout"

# --- bugfix/fix-something (branches from feature/dashboard HEAD) ---
git checkout -b bugfix/fix-something --quiet
commit "src/user-service.ts" "fix null pointer in user service"

# --- chore/update-deps (branches from bugfix/fix-something HEAD) ---
git checkout -b chore/update-deps --quiet
commit "package.json" "bump dependencies"

echo ""
echo "test-repo created with branches:"
git branch --list
echo ""
echo "Current branch: $(git branch --show-current)"
