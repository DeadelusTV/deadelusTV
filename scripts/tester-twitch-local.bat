@echo off
setlocal
cd /d "%~dp0\.."
where py >nul 2>&1
if %errorlevel%==0 (
    py -3 scripts\preview-twitch-ovh.py
) else (
    where python >nul 2>&1
    if %errorlevel%==0 (
        python scripts\preview-twitch-ovh.py
    ) else (
        echo Python 3 est necessaire pour ce test local.
        echo Le deploiement sur OVH n'a pas besoin de Python sur ton PC.
    )
)
echo.
pause
