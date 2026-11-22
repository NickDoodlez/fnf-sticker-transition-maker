@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js desde https://nodejs.org y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
call npm install
if errorlevel 1 pause & exit /b 1
call npm run build
if errorlevel 1 pause & exit /b 1
echo.
if exist "build\FNF Sticker Transition Maker.exe" (
  echo Listo. Tu app esta en la carpeta build
  start "" "build"
) else (
  echo El build no termino. Revisa los mensajes de arriba.
)
pause
