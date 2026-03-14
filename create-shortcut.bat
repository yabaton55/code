@echo off
cd /d "%~dp0"
set TARGET=%~dp0start.bat
set SHORTCUT=%USERPROFILE%\Desktop\銘柄ウォッチ起動.lnk
set ICON=%SystemRoot%\System32\shell32.dll

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%TARGET%'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%ICON%,21'; $s.Description = '銘柄ウォッチ起動'; $s.Save()"

echo デスクトップにショートカットを作成しました。
pause
