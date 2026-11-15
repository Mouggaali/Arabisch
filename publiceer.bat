@echo off
rem Publiceert de huidige versie van Darb op https://mouggaali.github.io/Arabisch/
rem Controleert eerst de inhoud, maakt dan een commit en pusht naar GitHub.
rem GitHub Actions bouwt en publiceert de site daarna automatisch (duurt 1 a 2 minuten).
cd /d "%~dp0"
title Darb publiceren

node tools\validate.mjs >nul
if errorlevel 1 (
  echo De inhoudscontrole vond problemen. Draai "node tools\validate.mjs" voor details. Er is niets gepubliceerd.
  pause
  exit /b 1
)

git add -A
git diff --cached --quiet && (
  echo Er zijn geen wijzigingen om te publiceren.
  pause
  exit /b 0
)
set /p MSG=Korte omschrijving van de wijziging:
if "%MSG%"=="" set MSG=Update Darb
git commit -m "%MSG%"
git push origin main
if errorlevel 1 (
  echo Pushen is mislukt. Controleer je internetverbinding of log opnieuw in bij GitHub.
  pause
  exit /b 1
)
echo.
echo Gepusht. Over 1 a 2 minuten staat de nieuwe versie op https://mouggaali.github.io/Arabisch/
echo Voortgang van de publicatie: https://github.com/Mouggaali/Arabisch/actions
pause
