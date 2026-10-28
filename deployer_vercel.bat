@echo off
title Deploiement Vercel - HIGH QUALITY Telecoms
cd /d "%~dp0"
echo ========================================================
echo   DEPLOIEMENT EN DIRECT SUR VERCEL
echo ========================================================
echo.
echo Lancement de la commande Vercel...
echo Suivez simplement les instructions a l'ecran (tapez Entree pour valider).
echo.
npx vercel --prod
echo.
pause
