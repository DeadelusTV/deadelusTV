@echo off
setlocal
cd /d "%~dp0\.."
echo Demarrage du site DEADELUSTV et de son acces API OVH...
if exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
  "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0preview-twitch-ovh.ps1"
) else (
  echo PowerShell Windows introuvable. Voir docs\test-lecteur-twitch-local.md.
)
echo.
pause
