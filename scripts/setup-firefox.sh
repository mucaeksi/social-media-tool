#!/usr/bin/env bash
set -euo pipefail
# Development-only Debian userspace install; apt checks signed indexes and hashes.
# Windows helpers use the user's installed Firefox and never run this script.
firefox_root=/workspace/.tools/firefox
firefox_apt=/workspace/.tools/firefox-apt
if [[ -x "$firefox_root/usr/lib/firefox-esr/firefox-esr" && "${1:-}" != --refresh ]]; then
  "$firefox_root/usr/lib/firefox-esr/firefox-esr" --version
  exit 0
fi
mkdir -p "$firefox_apt"/{lists/partial,cache/archives/partial,parts} "$firefox_root"
cat > "$firefox_apt/sources.list" <<'SOURCES'
deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://deb.debian.org/debian trixie main
deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://deb.debian.org/debian-security trixie-security main
SOURCES
cat > "$firefox_apt/apt.conf" <<CONFIG
Dir::Etc::parts "$firefox_apt/parts";
Dir::Etc::main "/dev/null";
Dir::Etc::sourcelist "$firefox_apt/sources.list";
Dir::Etc::sourceparts "-";
Dir::State::lists "$firefox_apt/lists";
Dir::Cache "$firefox_apt/cache";
APT::Sandbox::User "$(id -un)";
CONFIG
APT_CONFIG="$firefox_apt/apt.conf" apt-get update
(cd "$firefox_apt/cache" && APT_CONFIG="$firefox_apt/apt.conf" apt-get download firefox-esr)
python3 - <<'PY'
from pathlib import Path
import subprocess
p=max(Path('/workspace/.tools/firefox-apt/cache').glob('firefox-esr_*.deb'),key=lambda p:p.stat().st_mtime)
subprocess.run(['dpkg-deb','-x',str(p),'/workspace/.tools/firefox'],check=True)
PY
"$firefox_root/usr/lib/firefox-esr/firefox-esr" --version
