@echo off
cd /d "%~dp0"

set VBS=%TEMP%\mkshortcut.vbs
set TARGET=%~dp0start.bat
set SHORTCUT=%USERPROFILE%\Desktop\StockWatch.lnk

echo Set ws = CreateObject("WScript.Shell") > "%VBS%"
echo Set s = ws.CreateShortcut("%SHORTCUT%") >> "%VBS%"
echo s.TargetPath = "%TARGET%" >> "%VBS%"
echo s.WorkingDirectory = "%~dp0" >> "%VBS%"
echo s.IconLocation = "%SystemRoot%\System32\shell32.dll,21" >> "%VBS%"
echo s.Save() >> "%VBS%"

cscript //nologo "%VBS%"
del "%VBS%"

echo Done. Desktop shortcut "StockWatch" created.
pause
