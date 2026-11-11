@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node.exe >nul 2>&1
if errorlevel 1 call :activate_fnm
where node.exe >nul 2>&1
if errorlevel 1 (
  echo 未找到 Node.js。请先安装 Node.js LTS Windows 安装包，再双击此文件。
  echo 下载：https://nodejs.org/zh-cn/download
  pause
  exit /b 1
)
if not exist node_modules\vite\bin\vite.js (
  echo 正在准备项目依赖，首次可能需要几分钟……
  call npm.cmd ci
  if errorlevel 1 goto failed
)
call npm.cmd run assets
if errorlevel 1 goto failed
echo 浏览器将自动打开。体验期间请保持此窗口开启。
node scripts\launch.mjs
if errorlevel 1 goto failed
exit /b 0
:activate_fnm
where fnm.exe >nul 2>&1
if errorlevel 1 exit /b 0
for /f "delims=" %%i in ('fnm env --shell cmd') do call %%i
fnm use 26 >nul 2>&1
if not errorlevel 1 exit /b 0
fnm use 24 >nul 2>&1
if not errorlevel 1 exit /b 0
fnm use 22 >nul 2>&1
exit /b 0
:failed
echo 启动遇到问题，请保留本窗口并截图。
pause
exit /b 1
