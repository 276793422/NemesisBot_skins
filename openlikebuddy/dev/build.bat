@echo off
rem 构建 openlikebuddy 皮肤 -> dist\openlikebuddy.nbskin（单文件 ZIP，nbskin v1）
rem 两步：1) ui-src 里 npm install/build（Vue 应用 -> 皮肤包 app\）
rem       2) pack.mjs 打包（零依赖 Node 手写 ZIP，三平台行为一致——tar/zip CLI
rem          各平台方言差异大，见 pack.mjs 头注）。
setlocal
set "UI_SRC=%~dp0..\ui-src"

if not exist "%UI_SRC%\node_modules" (
  echo [build] npm install in ui-src ...
  pushd "%UI_SRC%"
  call npm install
  if errorlevel 1 goto :fail
  popd
)

echo [build] npm run build in ui-src ...
pushd "%UI_SRC%"
call npm run build
if errorlevel 1 goto :fail
popd

node "%~dp0pack.mjs"
exit /b %errorlevel%

:fail
popd
exit /b 1
