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

# =============================================================
# main branch — baseline commits
# =============================================================
commit "README.md" "initial commit"
commit "src/index.ts" "add entry point"

# =============================================================
# Branch: feature/auth — will be FAST-FORWARD merged into main
# (detectable by `git branch --merged`)
# =============================================================
git checkout -b feature/auth --quiet
commit "src/login.ts" "add login page"
commit "src/auth.ts" "add auth middleware"

git checkout main --quiet
git merge feature/auth --no-edit --quiet

# =============================================================
# Branch: feature/dashboard — will be SQUASH merged into main
# (NOT detectable by `git branch --merged`, needs `git cherry`)
# =============================================================
git checkout -b feature/dashboard --quiet
commit "src/dashboard.ts" "add dashboard layout"
commit "src/widgets.ts" "add dashboard widgets"

git checkout main --quiet
git merge --squash feature/dashboard --quiet
git commit -m "add dashboard feature (squashed)" --quiet

# =============================================================
# Branch: bugfix/old-fix — merged via real merge commit
# (detectable by `git branch --merged`)
# =============================================================
git checkout -b bugfix/old-fix --quiet
commit "src/user-service.ts" "fix null pointer in user service"

git checkout main --quiet
git merge bugfix/old-fix --no-ff --no-edit --quiet

# =============================================================
# Branch: feature/wip — NOT merged, has unique work
# (should NOT show up as merged)
# =============================================================
git checkout -b feature/wip --quiet
commit "src/experimental.ts" "start experimental feature"
commit "src/experimental2.ts" "more experimental work"

# =============================================================
# Branch: chore/update-deps — NOT merged, diverged from main
# (should NOT show up as merged)
# =============================================================
git checkout main --quiet
git checkout -b chore/update-deps --quiet
commit "package.json" "bump dependencies"

# =============================================================
# Branch: feature/empty — no commits ahead of main
# (trivially merged, same as main HEAD when created)
# =============================================================
git checkout main --quiet
git checkout -b feature/empty --quiet

# =============================================================
# Tag on main for ref badge testing
# =============================================================
git tag v1.0 main

# =============================================================
# Set up a bare remote with a stale ref
# =============================================================
cd ..
git clone --bare "$REPO_DIR" "$REMOTE_DIR" --quiet

cd "$REPO_DIR"
git remote add origin "../$REMOTE_DIR"
git fetch origin --quiet

# Delete a branch on the remote directly so test-repo has a stale tracking ref
git -C "../$REMOTE_DIR" branch -D feature/auth 2>/dev/null || true

# Go back to main for a clean starting state
git checkout main --quiet

echo ""
echo "=== test-repo created ==="
echo ""
echo "Branches:"
git branch --list
echo ""
echo "Current branch: $(git branch --show-current)"
echo ""
echo "Expected merge detection results:"
echo "  MERGED (fast-forward):  feature/auth"
echo "  MERGED (squash):        feature/dashboard"
echo "  MERGED (merge commit):  bugfix/old-fix"
echo "  MERGED (no new commits):feature/empty"
echo "  NOT MERGED:             feature/wip"
echo "  NOT MERGED:             chore/update-deps"
echo ""
echo "Stale remote refs (should show origin/feature/auth):"
git remote prune origin --dry-run 2>&1 || true
