@echo off
REM Start React dev server on PORT=3001 without interactive prompt
set CI=true
set PORT=3001
call npx react-scripts start