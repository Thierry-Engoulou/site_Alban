@echo off
title HIGH QUALITY Telecoms - Serveur Web
cd /d "%~dp0"
echo ========================================================
echo   DEMARRAGE DE L'APPLICATION WEB HIGH QUALITY TELECOMS
echo ========================================================
echo.
echo Ouverture du site dans le navigateur...
start http://localhost:3000
echo.
echo Lancement du serveur Node.js sur le port 3000...
echo.
node server.js
pause
