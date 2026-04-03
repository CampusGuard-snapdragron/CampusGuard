#!/bin/bash

# CampusGuard System Control Tool
# (c) 2026 CampusGuard Team

SERVER_URL="https://campusguard-server-production.up.railway.app"
ANALYTICS_URL="https://campusguard-analytics-production.up.railway.app"
AUTH_TOKEN="8bb29658ad048ef57e46d5665bf6c9014aa9f6d62c776e06261a8ef8541caa24"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   CampusGuard Management Console      ${NC}"
echo -e "${BLUE}=======================================${NC}"

status() {
    echo -e "\n🔍 Checking System Health..."
    
    # 1. Check Backend
    echo -n "1. Backend Server: "
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/health")
    if [ "$HEALTH" == "200" ]; then
        echo -e "${GREEN}ONLINE${NC} ($SERVER_URL)"
    else
        echo -e "${RED}OFFLINE${NC} (Status: $HEALTH)"
    fi

    # 2. Check Stats (Auth Check)
    echo -n "2. Data Access:    "
    STATS=$(curl -s -H "x-campusguard-token: $AUTH_TOKEN" "$SERVER_URL/alerts/stats")
    if [[ $STATS == *"total"* ]]; then
        TOTAL=$(echo $STATS | sed -E 's/.*"total":([0-9]+).*/\1/')
        echo -e "${GREEN}AUTHORIZED${NC} (Total Alerts: $TOTAL)"
    else
        echo -e "${RED}UNAUTHORIZED${NC} (Check Token)"
    fi

    # 3. Check Android Build
    echo -n "3. Local Android:  "
    if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
        SIZE=$(du -h app/build/outputs/bundle/release/app-release.aab | cut -f1)
        echo -e "${GREEN}READY${NC} ($SIZE)"
    else
        echo -e "${RED}NOT FOUND${NC} (Run: ./gradlew :app:bundleRelease)"
    fi

    # 4. Check Analytics Dashboard
    echo -n "4. Analytics Web:   "
    AN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ANALYTICS_URL")
    if [ "$AN_STATUS" == "200" ]; then
        echo -e "${GREEN}ONLINE${NC} ($ANALYTICS_URL)"
    else
        echo -e "${RED}OFFLINE${NC} ($ANALYYICS_URL)"
    fi
}

logs() {
    echo -e "\n📋 Tailing Railway Logs (Core)..."
    railway logs --service campusguard-server
}

logs-analytics() {
    echo -e "\n📊 Tailing Analytics Logs..."
    railway logs --service campusguard-analytics
}

deploy() {
    PROJECT_ID="d94f1360-8f96-490e-a8df-2bfbe32da1f3"
    ENV="production"

    echo -e "\n🚀 Pushing Core Update to Railway..."
    cd server && railway up --project $PROJECT_ID --environment $ENV --service campusguard-server -d && cd ..
    
    echo -e "\n📊 Pushing Analytics Update..."
    cd ../Dashboard/dashboard && railway up --project $PROJECT_ID --environment $ENV --service campusguard-analytics -d && cd ../../CampusGuard
}

case "$1" in
    status)
        status
        ;;
    logs)
        logs
        ;;
    deploy)
        deploy
        ;;
    *)
        echo "Usage: ./campusguardctl.sh {status|logs|deploy}"
        exit 1
esac
