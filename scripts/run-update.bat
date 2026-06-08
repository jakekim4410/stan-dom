@echo off
echo Starting Hot Issues Auto Update...
cd /d "%~dp0.."
node scripts/manual-update-hot-issues.mjs
echo Done.
