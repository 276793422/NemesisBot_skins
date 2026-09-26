@echo off
rem 构建 openlikebuddy 皮肤 -> dist\openlikebuddy.nbskin（单文件 ZIP，nbskin v1）
rem pack.mjs 打包 manifest.json + skin\openlikebuddy.css（theme 载荷 only——
rem 零依赖 Node 手写 ZIP，三平台行为一致，见 pack.mjs 头注）。
rem ui-src\（独立应用复刻产物）已不属于皮肤包，无需构建。
setlocal
node "%~dp0pack.mjs"
exit /b %errorlevel%
