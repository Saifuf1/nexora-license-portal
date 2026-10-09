@echo off
title Push Nexora License Portal to GitHub Pages
echo ========================================================
echo  Deploying Nexora License Portal to GitHub Pages
echo  Target URL: https://saifuf1.github.io/nexora-license-portal/
echo ========================================================
echo.
cd /d "%~dp0"
git remote remove origin 2>nul
git remote add origin https://github.com/saifuf1/nexora-license-portal.git
git branch -M main
git add .
git commit -m "Update Nexora License Master & AI Portal" 2>nul
echo Pushing to GitHub (main branch)...
git push -u origin main
echo.
echo ========================================================
echo  Next Steps:
echo  1. In your GitHub repo: Go to Settings -> Pages
echo  2. Select Source: Deploy from a branch -> main -> / (root) -> Save
echo  3. Your site is live at:
echo     https://saifuf1.github.io/nexora-license-portal/
echo ========================================================
pause
