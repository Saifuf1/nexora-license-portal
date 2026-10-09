@echo off
title Push Nexora License Portal to GitHub Pages
echo ========================================================
echo  Deploying Nexora License Portal to GitHub Pages
echo  Target URL: https://saifuf1.github.io/nexora-license-portal/
echo ========================================================
echo.
cd /d "%~dp0"
git remote remove origin 2>nul
git remote add origin https://github.com/Saifuf1/nexora-license-portal.git
git branch -M main
git add index.html README.md launch_portal.bat push_to_github.bat
git commit -m "Deploy Nexora ERP Mobile-First License Studio & AI Assistant" 2>nul
echo.
echo Pushing updated code to GitHub (main branch)...
git push -u origin main --force
echo.
echo ========================================================
echo  Deployment complete!
echo  Your site is live at:
echo  https://saifuf1.github.io/nexora-license-portal/
echo  Password: 6969@Nkd
echo ========================================================
pause
