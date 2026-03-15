#!/bin/bash
# tools/fix_git_history.sh — NEW (CRIT-02)
# Removes static/uploads from git tracking and history
# Run ONCE on the repository to clean up committed uploads

set -euo pipefail

echo "╔══════════════════════════════════════════════════════╗"
echo "║  INPHORA — Git History Cleanup (CRIT-02 fix)         ║"
echo "║  This removes static/uploads from git tracking       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# 1. Stop tracking uploads directory (keep local files intact)
echo "Step 1: Removing static/uploads from git index..."
git rm -r --cached static/uploads/ 2>/dev/null || echo "  (nothing to remove from index)"

# 2. Create .gitkeep to preserve directory structure
mkdir -p static/uploads
touch static/uploads/.gitkeep
echo "  Created static/uploads/.gitkeep"

# 3. Ensure .gitignore has the right entry
if ! grep -q "static/uploads/\*" .gitignore 2>/dev/null; then
  echo "" >> .gitignore
  echo "# User uploads — never commit" >> .gitignore
  echo "static/uploads/*" >> .gitignore
  echo "!static/uploads/.gitkeep" >> .gitignore
  echo "  Updated .gitignore"
fi

echo ""
echo "Step 2: Committing the .gitignore fix..."
git add .gitignore static/uploads/.gitkeep
git commit -m "fix(security): stop tracking user uploads directory [CRIT-02]" || echo "  (nothing to commit)"

echo ""
echo "Step 3 (OPTIONAL but recommended): Purge uploads from full git history."
echo "  This uses git-filter-repo (install: pip install git-filter-repo)"
echo "  WARNING: This rewrites history — coordinate with all team members first!"
echo ""
echo "  Command to run if you choose to purge:"
echo "    git filter-repo --path static/uploads --invert-paths --force"
echo "    git push origin master --force-with-lease"
echo ""
echo "Done. static/uploads is no longer tracked by git."
