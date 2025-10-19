Set WshShell = CreateObject("WScript.Shell")

' Переходим в директорию ScaleBridge и запускаем без окна
scaleDir = "C:\Users\ADMIN\Desktop\projekt\GGG\backend\installers\ScaleBridge"
WshShell.CurrentDirectory = scaleDir

' Запуск через node start-no-console.js (без окна CMD)
WshShell.Run "node start-no-console.js", 0, False

' Небольшая пауза и проверка
WScript.Sleep 2000













