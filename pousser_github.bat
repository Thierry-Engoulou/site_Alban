@echo off
title Envoi vers GitHub - Thierry-Engoulou
cd /d "%~dp0"
echo ========================================================
echo   ENVOI DU SITE VERS GITHUB (Thierry-Engoulou/site_Alban)
echo ========================================================
echo.
echo Envoi en cours...
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo   SUCCES ! Le code est maintenant sur votre GitHub.
    echo   Rendez-vous sur Vercel : https://vercel.com/new
    echo   et cliquez sur "Import" puis "Deploy" !
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo   INFO : Si le depot n'existe pas encore sur GitHub,
    echo   creez-le simplement sur https://github.com/new
    echo   avec le nom : site_Alban
    echo   puis relancez ce script !
    echo ========================================================
)
echo.
pause
