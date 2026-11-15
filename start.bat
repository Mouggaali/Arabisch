@echo off
rem Start de Arabische leeromgeving op http://localhost:8080 en open de browser.
rem Een lokale server is nodig: browsers blokkeren het laden van lesbestanden via file://.
rem Laat dit venster open zolang je de app gebruikt; sluit het om de server te stoppen.
cd /d "%~dp0"
title Darb - lokale server (laat dit venster open)

rem Open de browser pas na 2 seconden, zodat de server dan al draait.
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:8080"

where py >nul 2>nul && (py -m http.server 8080 --bind 127.0.0.1 & goto :einde)
where python >nul 2>nul && (python -m http.server 8080 --bind 127.0.0.1 & goto :einde)
npx --yes serve -l 8080 .

:einde
echo.
echo De server is gestopt. Staat er hierboven een foutmelding, maak dan een schermafbeelding.
pause
