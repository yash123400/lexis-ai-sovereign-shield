import os
import json
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

def generate_weekly_executive_briefing(firm_id="LX-MAYFAIR", sra_id="SRA-12345", dpo_contact="dpo@mayfairlaw.co.uk"):
    """
    Simulates aggregating a 7-day system health snapshot from the Vault and 
    recent Jurimetric logs, plus extracting the latest Horizon Scan, to send
    an 'Apple Fitness'-style ring report to the Managing Partner.
    """
    
    print("==================================================")
    print("📊  Lexis-AI: Compiling Executive Health Briefing")
    print("==================================================\n")
    
    # Normally these metrics would query a database or /compliance_vault/
    # Task 1: The 'Sentinel' Summary Parameters
    metrics = {
        "uptime": "99.9% API stability across Clio & Land Registry.",
        "lead_valuation": "42 Leads processed; 8 'High-Yield' consultations booked automatically.",
        "security": "0 PII leaks detected; 1,400 logs encrypted and vaulted."
    }
    
    # Task 2: The Regulatory 'Horizon Scan' 
    # Simulated fetch from reg-tracker output
    horizon_scan = (
        "SRA Update: New guidance on AI Transparency issued Feb 2026. "
        "Lexis-AI has automatically updated your 'Client Information' templates "
        "to reflect these changes via hotfix/schema-drift."
    )
    
    # Task 3: Call to Action Payload
    print("[Exec-Brief] Formatting interactive Slack UI blocks...")
    
    block_kit_payload = {
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"🛡️ Lexis-AI: {firm_id} Executive Briefing",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*System Health & Sovereign Audit (Last 7 Days)*\n"
                            f"✅ *Uptime:* {metrics['uptime']}\n"
                            f"📈 *Jurimetrics:* {metrics['lead_valuation']}\n"
                            f"🔒 *Security:* {metrics['security']}\n\n"
                            f"*Regulatory Metadata*\n"
                            f"⚖️ *SRA Registration:* {sra_id}  |  👤 *DPO Contact:* {dpo_contact}"
                }
            },
            {
                "type": "divider"
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*🔭 Regulatory Horizon Scan*\n{horizon_scan}"
                }
            },
            {
                "type": "divider"
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Approve 8 High-Value Matters",
                            "emoji": True
                        },
                        "style": "primary",
                        "value": "approve_matters_action"
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "View Full Compliance Audit Trail"
                        },
                        "value": "view_vault_action"
                    }
                ]
            }
        ]
    }
    
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    
    print(f"\n[Partner-Alert] Slack Block-Kit Payload Built:\n{json.dumps(block_kit_payload, indent=2)}")
    
    if webhook_url:
        try:
            response = requests.post(webhook_url, json=block_kit_payload)
            response.raise_for_status()
            print("\n[Partner-Alert] 🚀 Weekly Briefing successfully delivered to #executive-committee!")
        except Exception as e:
            print(f"\n[Partner-Alert] ❌ Execution Failed: {e}")
    else:
        print("\n[Partner-Alert] 🚀 (Simulated) Weekly Briefing successfully delivered to #executive-committee!")

if __name__ == "__main__":
    generate_weekly_executive_briefing()
