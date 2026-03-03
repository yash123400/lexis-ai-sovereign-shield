import requests
import json
import os

def trigger_high_priority_workflow(client_data, expected_value):
    """
    Task 2: Task 2: The 'High-Priority' Workflow (Score > 80)
    1. Instantly ping the Partner via Slack
    2. Offer an immediate 15-minute 'Partner Consultation' link in the chat.
    """
    print("\n[Partner-Alert] 🚨 HIGH-VALUE OPPORTUNITY PIPELINE TRIGGERED 🚨")
    
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    
    name = client_data.get("client_info", {}).get("full_name", client_data.get("client_name", "Unknown Lead"))
    company = client_data.get("verification_results", {}).get("company_name", client_data.get("company_name", "N/A"))
    
    slack_text = f"🚨 HIGH-VALUE OPPORTUNITY: {name} from {company}. $EV Estimate: £{expected_value:,.2f}."
    
    if webhook_url:
        try:
           requests.post(webhook_url, json={"text": slack_text})
           print("[Partner-Alert] -> SMS/Slack dispatched to Partner device.")
        except Exception as e:
           print(f"[Partner-Alert] -> Failed to send webhook: {e}")
    else:
        print(f"[Partner-Alert] (Simulated Webhook) -> {slack_text}")
        
    chat_response = (
        "Based on the complexity and scale of your requirements, I have "
        "priority-flagged your file. Would you like to schedule an immediate "
        "15-minute discovery call with our Senior Partner? You can book directly "
        "on their calendar here: https://calendly.com/lexis-ai-partner/15min"
    )
    
    print(f"\n[Agent-Response] 🎖️ {chat_response}")
    return chat_response

def trigger_automated_handle_workflow(client_data):
    """
    Task 3: The 'Automated Handle' Workflow (Score < 30)
    1. Provide the firm's standard 'Information Pack' PDF.
    2. Collect their details and push to Clio as a 'Lead' (not a 'Matter').
    3. End the chat politely without offering a Partner booking.
    """
    print("\n[Automated-Routing] 📉 STANDARD NURTURE PIPELINE TRIGGERED 📉")
    print("[Partner-Alert] 👁️ Human-in-the-Loop: Review generated lead prior to absolute rejection.")
    print("[Automated-Routing] -> Pushing contact data directly to Clio (Lead Status / No Matter Created).")
    
    chat_response = (
        "Thank you for providing those details. I have forwarded your inquiry to "
        "our review team. In the meantime, please review our standard Information Pack "
        "outlining our general practice areas: https://lexis-ai.com/downloads/Info_Pack.pdf. "
        "We will reach out via email if we require further details. Have a wonderful day."
    )
    
    print(f"\n[Agent-Response] 📁 {chat_response}")
    return chat_response
