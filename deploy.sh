#!/bin/bash
# Production Deployment Script
# Usage: ./deploy.sh [up|down|restart|logs|build]

set -e

COMPOSE_FILE="docker-compose.prod.yml"

echo "============================================"
echo "  Opname Aset - Production Deployment Script"
echo "============================================"

# Function to check env requirements
check_env() {
    if [ ! -f "app/.env" ]; then
        echo "❌ ERROR: file app/.env tidak ditemukan!"
        echo "Silakan copy app/.env.example ke app/.env dan isi konfigurasi yang dibutuhkan."
        exit 1
    fi
    
    # Check for empty mandatory vars
    if grep -q "^JWT_SECRET=$" "app/.env"; then
        echo "❌ ERROR: JWT_SECRET di app/.env masih kosong!"
        exit 1
    fi
    if grep -q "^PASSWORD_SALT=$" "app/.env"; then
        echo "❌ ERROR: PASSWORD_SALT di app/.env masih kosong!"
        exit 1
    fi
    
    echo "✅ [INFO] File .env valid."
}

# Command Router
case "$1" in
    up)
        check_env
        echo "🚀 [INFO] Starting containers in detached mode..."
        docker compose -f $COMPOSE_FILE up -d
        echo "✅ [SUCCESS] Containers started successfully."
        ;;
    down)
        echo "🛑 [INFO] Stopping and removing containers..."
        docker compose -f $COMPOSE_FILE down
        echo "✅ [SUCCESS] Containers stopped."
        ;;
    build)
        check_env
        echo "🏗️ [INFO] Rebuilding image with no-cache..."
        docker compose -f $COMPOSE_FILE build --no-cache
        echo "✅ [SUCCESS] Image built successfully."
        ;;
    restart)
        check_env
        echo "🔄 [INFO] Restarting containers..."
        docker compose -f $COMPOSE_FILE restart
        echo "✅ [SUCCESS] Containers restarted."
        ;;
    logs)
        docker compose -f $COMPOSE_FILE logs -f
        ;;
    *)
        echo "Usage: $0 {up|down|restart|logs|build}"
        echo "  up      : Menjalankan container di background"
        echo "  down    : Menghentikan dan menghapus container"
        echo "  build   : Build ulang Docker image (no cache)"
        echo "  restart : Restart container"
        echo "  logs    : Menampilkan log container (follow)"
        exit 1
        ;;
esac
