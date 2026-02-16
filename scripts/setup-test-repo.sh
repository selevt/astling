#!/usr/bin/env bash
# Bootstrap a local test git repository for development.
# Run from the project root: bash scripts/setup-test-repo.sh

set -euo pipefail

REPO_DIR="test-repo"
REMOTE_DIR="test-remote.git"

if [ -d "$REPO_DIR/.git" ] && [ "${1:-}" != "-f" ]; then
  echo "test-repo already exists — pass -f to force recreate."
  exit 0
fi

rm -rf "$REPO_DIR" "$REMOTE_DIR"
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

## --- Set up a bare remote with a stale ref ---
# Go back to project root
cd ..
git clone --bare "$REPO_DIR" "$REMOTE_DIR" --quiet

# Point test-repo at this bare remote
cd "$REPO_DIR"
git remote add origin "../$REMOTE_DIR"
git fetch origin --quiet

# Delete a branch on the remote directly so test-repo has a stale tracking ref
git -C "../$REMOTE_DIR" branch -D feature/auth 2>/dev/null || true

echo ""
echo "test-repo created with branches:"
git branch --list
echo ""
echo "Current branch: $(git branch --show-current)"
echo ""
echo "Stale remote refs (should show origin/feature/auth):"
git remote prune origin --dry-run 2>&1 || true
