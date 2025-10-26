#!/bin/bash

# Скрипт установки HestiaCP и удаления aaPanel
set -e

echo "🎯 Установка HestiaCP и удаление aaPanel..."

# Удаление aaPanel
echo "🗑️  Удаляем aaPanel..."

# Останавливаем службы aaPanel
if [ -f /etc/init.d/bt ]; then
    echo "   ⏹️  Останавливаем aaPanel..."
    sudo /etc/init.d/bt stop
    sudo /etc/init.d/bt uninstall
fi

# Останавливаем другие службы
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl stop apache2 2>/dev/null || true
sudo systemctl stop mysql 2>/dev/null || true

# Удаляем файлы aaPanel
echo "   🗑️  Удаляем файлы aaPanel..."
sudo rm -rf /www
sudo rm -rf /usr/bin/bt
sudo rm -f /etc/init.d/bt
sudo rm -rf /etc/init.d/bt
sudo rm -rf /tmp/panelLock.pl
sudo rm -rf /www/server
sudo rm -rf /usr/local/aapanel

echo "✅ aaPanel удален"

# Установка HestiaCP
echo "📦 Устанавливаем HestiaCP..."
wget https://raw.githubusercontent.com/hestiacp/hestiacp/release/install/hcp-install.sh
bash hcp-install.sh --port '8083' --email 'admin@gar-ant-bet-on.ru' --password 'changeme123' --hostname 'gar-ant-bet-on.ru' --interfaces 'eth0' --force

echo "✅ HestiaCP установлен!"
echo ""
echo "🌐 HestiaCP будет доступен по адресу: https://78.40.109.177:8083"
echo "📧 Email: admin@gar-ant-bet-on.ru"
echo "🔑 Пароль: changeme123"
echo ""
echo "⚠️  СРАЗУ СМЕНИТЕ ПАРОЛЬ!"
