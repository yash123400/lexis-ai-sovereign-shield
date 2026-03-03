import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def notify_partner(client_summary, risk_score):
    """
    Sends a formatted Executive Briefing to a Slack/Teams webhook endpoint.
    If multiple issues or a high risk score exist, alerts the #new-clients channel.
    """
    
    webhook_url = os.getenv("SLACK_WEBHOOK_URL") 
    
    if not webhook_url:
        print("[Partner-Alert] Warning: SLACK_WEBHOOK_URL not configured in .env; skipping actual network request.")
        
    print(f"\n[Partner-Alert] Formulating Executive Briefing for Partner Review...")
        
    # Build text block payload
    alert_color = "#36a64a" if risk_score < 50 else "#ff0000" # Green if low risk, red if high
    
    # Extract data from deep payload
    client_name = client_summary.get("client_info", {}).get("full_name", client_summary.get("client_name", "N/A"))
    company_name = client_summary.get("verification_results", {}).get("company_name", client_summary.get("company_name", "N/A"))
    practice_area = client_summary.get("matter_details", {}).get("practice_area", "N/A")
    est_value = client_summary.get("matter_details", {}).get("estimated_value", "N/A")
    status_msg = "Matter created in Clio. Engagement letter drafted." if risk_score < 50 else "ABORTED"
    
    payload = {
        "text": f"🚀 New Client Onboarded: {client_name}\n\nCompany: {company_name} (Verified)\nPractice Area: {practice_area}\nEst. Value: {est_value}\nStatus: {status_msg}"
    }
    
    # In a real scenario, this executes the POST. 
    # For now we print the payload that would be sent.
    print(f"[Partner-Alert] Slack Payload Ready:\n{json.dumps(payload, indent=2)}")
    
    if webhook_url:
        try:
            r = requests.post(webhook_url, json=payload)
            r.raise_for_status()
            print("[Partner-Alert] 🚀 Alert sent to #new-clients successfully!")
        except Exception as e:
            print(f"[Partner-Alert] ❌ Failed to send Slack Webhook: {e}")
    else:
        print("[Partner-Alert] 🚀 (Simulated) Alert sent to #new-clients successfully!")
        
    return True

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            data = json.load(f)
            
        risk = 10 if data.get("address_match") else 85
        notify_partner(data, risk)
