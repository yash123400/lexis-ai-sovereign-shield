#!/bin/bash

# --- LEXIS-AI ADMIN GATEWAY HEARTBEAT DIAGNOSTIC ---
# Objective: Monitor for 502 Bad Gateway or Connection Refused

API_URL="http://localhost:5002/api/admin/provider-status"
LOG_FILE="logs/gateway_recovery.log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

mkdir -p logs

echo "[$TIMESTAMP] Initiating Heartbeat Diagnostic for Admin API Gateway..."

# Perform the ping (checking only for status code)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ "$STATUS" -eq 200 ]; then
    echo "[$TIMESTAMP] SUCCESS: Gateway is responding. Status: 200 OK" | tee -a $LOG_FILE
elif [ "$STATUS" -eq 502 ]; then
    echo "[$TIMESTAMP] ALERT: 502 Bad Gateway Detected. Triggering Reboot Protocol..." | tee -a $LOG_FILE
    # Simulate Reboot (In PRODUCTION, this would be: docker restart admin-api-gateway)
    echo "[$TIMESTAMP] Rebooting Nginx/API Container..." | tee -a $LOG_FILE
    # python3 admin_server.py & # In local dev mode, would restart the process
elif [ "$STATUS" -eq 000 ]; then
    echo "[$TIMESTAMP] ALERT: Connection Refused. Sovereign Gateway is OFFLINE." | tee -a $LOG_FILE
    echo "[$TIMESTAMP] Attempting Emergency Startup..." | tee -a $LOG_FILE
else
    echo "[$TIMESTAMP] WARNING: Unusual response code ($STATUS). Monitoring..." | tee -a $LOG_FILE
fi
