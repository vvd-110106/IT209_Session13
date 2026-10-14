#!/bin/bash
set -e

echo "=========================================="
echo "    CAMPUS HUB - DEPLOYMENT SCRIPT        "
echo "=========================================="

# Check and install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "[-] Docker chưa được cài đặt trên hệ thống."
    echo "[*] Đang tiến hành cài đặt Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    if [ "$EUID" -ne 0 ]; then
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER || true
    else
        sh get-docker.sh
    fi
    rm -f get-docker.sh
    echo "[+] Đã cài đặt Docker thành công!"
fi

# Determine if docker compose needs sudo
DOCKER_COMPOSE="docker compose"
if ! docker info &> /dev/null; then
    if sudo docker info &> /dev/null; then
        DOCKER_COMPOSE="sudo docker compose"
    fi
fi

# Ensure .env file exists
if [ ! -f .env ]; then
    echo "[*] Chưa tìm thấy tệp .env, đang sao chép từ .env.example..."
    cp .env.example .env
fi

# Stop existing containers if running
echo "[*] Dừng các container cũ nếu đang chạy..."
$DOCKER_COMPOSE down || true

# Build and start services
echo "[*] Tiến hành build và khởi động các container..."
$DOCKER_COMPOSE up -d --build

# Wait and check status
echo "[*] Đang kiểm tra trạng thái dịch vụ..."
sleep 5
$DOCKER_COMPOSE ps

echo ""
echo "=========================================="
echo "[+] TRIỂN KHAI HOÀN TẤT!"
echo "    - Frontend & Web: http://$(curl -s ifconfig.me || echo 'VPS_IP')/"
echo "    - Backend API:    http://$(curl -s ifconfig.me || echo 'VPS_IP'):8080/api"
echo "    - Health Check:   http://$(curl -s ifconfig.me || echo 'VPS_IP')/actuator/health"
echo "=========================================="
