#!/usr/bin/env bash
# =============================================================================
# check-env-separation.sh — CI guard for environment separation
# =============================================================================
# Purpose:
#   Detect secrets and environment misconfigurations that violate the
#   environment separation policy defined in the production excellence roadmap.
#
# Usage:
#   bash scripts/check-env-separation.sh
#   Exit code 0 = pass, 1 = violations found
#
# Add to CI pipeline (GitHub Actions example):
#   - name: Check env separation
#     run: bash scripts/check-env-separation.sh
#
# Rules enforced:
#   1. No .env files (non-example) tracked by git
#   2. No .env files contain NODE_ENV=production or NODE_ENV=staging
#      in development-intended locations
#   3. No hardcoded placeholder patterns in committed .env.*.example files
#      that look like real secrets (e.g., actual JWTs, real MongoDB URIs)
#   4. No known secret patterns leaked in source code files
#   5. No API keys or tokens in JS/TS/Python source files
# =============================================================================

set -euo pipefail

ERRORS=0
WARNINGS=0

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_error() { echo -e "${RED}[ERROR]${NC} $1"; ERRORS=$((ERRORS + 1)); }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; WARNINGS=$((WARNINGS + 1)); }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }

echo ""
echo "============================================================"
echo "  Environment Separation Check"
echo "  Project: EmployeeManagement"
echo "  Date:    $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

# ---------------------------------------------------------------------------
# Rule 1: No real .env files tracked by git
# ---------------------------------------------------------------------------
log_info "Rule 1: Checking for real .env files tracked by git..."

TRACKED_ENV_FILES=$(git ls-files | grep -E '^.*\.env$|^.*\.env\.[^e]|^.*\.env\.s[^t]|^.*\.env\.p' \
  | grep -v '\.env\.example$' \
  | grep -v '\.env\.staging\.example$' \
  | grep -v '\.env\.production\.example$' \
  | grep -v '\.env\.test\.example$' \
  | grep -v '\.env\.docker\.example$' \
  || true)

# Simpler approach: find any .env* file tracked that is NOT an .example
TRACKED_REAL_ENV=$(git ls-files | grep '\.env' | grep -v '\.example$' || true)

if [ -n "$TRACKED_REAL_ENV" ]; then
  log_error "Real .env files are tracked by git (must not be committed):"
  echo "$TRACKED_REAL_ENV" | while read -r f; do echo "    → $f"; done
else
  log_ok "No real .env files tracked by git"
fi

# ---------------------------------------------------------------------------
# Rule 2: No NODE_ENV=production in development .env files (local)
# ---------------------------------------------------------------------------
log_info "Rule 2: Checking for NODE_ENV=production in development env files..."

DEV_ENV_FILES=$(find . \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -name ".env" \
  -o -name ".env.development" \
  2>/dev/null || true)

for f in $DEV_ENV_FILES; do
  if grep -q 'NODE_ENV=production' "$f" 2>/dev/null; then
    log_error "Found NODE_ENV=production in development file: $f"
  fi
done

if [ $ERRORS -eq 0 ]; then
  log_ok "No NODE_ENV=production found in development env files"
fi

# ---------------------------------------------------------------------------
# Rule 3: .env.*.example files must not contain real secret values
# ---------------------------------------------------------------------------
log_info "Rule 3: Checking .env.*.example files for real secret patterns..."

EXAMPLE_FILES=$(find . \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  \( -name ".env.example" -o -name ".env.*.example" \) \
  2>/dev/null || true)

# Patterns that indicate a real secret was accidentally placed in example file
REAL_SECRET_PATTERNS=(
  # Real JWT (base64 encoded, 100+ chars)
  'eyJ[A-Za-z0-9_-]{50,}\.[A-Za-z0-9_-]{50,}'
  # Real MongoDB Atlas URI
  'mongodb\+srv://[^:]+:[^@]+@'
  # Real Redis Cloud URI with password
  'redis://:[^@]+@[a-z0-9.-]+\.redis\.cache\.'
  # AWS secret access key pattern
  '[A-Za-z0-9/+]{40}(?=[^A-Za-z0-9/+]|$)'
)

for f in $EXAMPLE_FILES; do
  # Check for JWT patterns
  if grep -qE 'eyJ[A-Za-z0-9_-]{50,}\.' "$f" 2>/dev/null; then
    log_error "Possible real JWT token found in example file: $f"
  fi
  # Check for real MongoDB Atlas URI
  if grep -qE 'mongodb\+srv://[^:]+:[^@]+@' "$f" 2>/dev/null; then
    log_error "Possible real MongoDB Atlas URI found in example file: $f"
  fi
  # Check for non-placeholder values where REPLACE_WITH_ is expected
  if grep -qE '^(JWT_SECRET|JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|SYNC_SECRET|AI_API_KEY)=[^R]' "$f" 2>/dev/null; then
    # Allow test-* and dev-* prefixes (test/dev env examples)
    if grep -qE '^(JWT_SECRET|JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|SYNC_SECRET|AI_API_KEY)=(test-|dev-|staging-)' "$f" 2>/dev/null; then
      : # OK, it's a test/dev/staging placeholder
    else
      log_warn "Secret variable in $f may contain a non-placeholder value. Review manually."
    fi
  fi
done

log_ok "Example file scan complete"

# ---------------------------------------------------------------------------
# Rule 4: No API keys or secrets hardcoded in source files
# ---------------------------------------------------------------------------
log_info "Rule 4: Scanning source files for hardcoded secrets..."

SOURCE_EXTENSIONS=("*.js" "*.ts" "*.tsx" "*.jsx" "*.py" "*.json")
EXCLUDE_PATHS=("node_modules" ".git" "coverage" "dist" "build" ".venv" "__pycache__")

BUILD_EXCLUDE=""
for p in "${EXCLUDE_PATHS[@]}"; do
  BUILD_EXCLUDE="$BUILD_EXCLUDE --exclude-dir=$p"
done

# Check for common secret patterns in source code
SECRET_FINDINGS=""

# Hardcoded JWT secrets
if grep -rl $BUILD_EXCLUDE \
  -E "(jwt_secret|JWT_SECRET)\s*[=:]\s*['\"][^'\"]{20,}['\"]" \
  --include="*.js" --include="*.ts" --include="*.py" . 2>/dev/null | \
  grep -v '\.example' | grep -v 'test' | grep -v 'spec' | grep -q .; then
  log_warn "Possible hardcoded JWT secret found in source files. Run: grep -rn 'JWT_SECRET.*=' --include='*.js'"
fi

# Hardcoded API keys (common patterns)
if grep -rl $BUILD_EXCLUDE \
  -E "api[_-]?key\s*[=:]\s*['\"][a-zA-Z0-9_-]{20,}['\"]" \
  --include="*.js" --include="*.ts" --include="*.py" . 2>/dev/null | \
  grep -v '\.example' | grep -v 'test' | grep -v 'spec' | grep -v '\.env' | grep -q .; then
  log_warn "Possible hardcoded API key found in source files. Run: grep -rn 'api_key.*=' --include='*.js'"
fi

log_ok "Source file secret scan complete"

# ---------------------------------------------------------------------------
# Rule 5: No .env files in Docker images (check .dockerignore)
# ---------------------------------------------------------------------------
log_info "Rule 5: Checking .dockerignore files for .env exclusion..."

DOCKERIGNORE_FILES=$(find . \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -name ".dockerignore" \
  2>/dev/null || true)

for f in $DOCKERIGNORE_FILES; do
  if ! grep -q '\.env' "$f" 2>/dev/null; then
    log_warn ".dockerignore at $f does not explicitly exclude .env files"
  else
    log_ok ".dockerignore at $f excludes .env files"
  fi
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
echo "  Summary"
echo "============================================================"
echo "  Errors:   $ERRORS"
echo "  Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}FAILED${NC} — $ERRORS error(s) must be fixed before merging."
  echo ""
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}PASSED with warnings${NC} — $WARNINGS warning(s) should be reviewed."
  echo ""
  exit 0
else
  echo -e "${GREEN}PASSED${NC} — All environment separation checks passed."
  echo ""
  exit 0
fi
