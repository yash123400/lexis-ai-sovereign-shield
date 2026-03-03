import os
import json
import subprocess
import argparse
import sys

# Ensure Python can import the skills easily across directories
agent_skills_path = os.path.join(os.path.dirname(__file__), ".agent", "skills")
sys.path.append(os.path.join(agent_skills_path, "pms-integration"))
sys.path.append(os.path.join(agent_skills_path, "clio-sync"))
sys.path.append(os.path.join(agent_skills_path, "partner-alert"))
sys.path.append(os.path.join(agent_skills_path, "lead-valuation"))

try:
    from pms_client import create_legal_contact
    from clio_matter import create_matter
    from notify_partner import notify_partner
    from valuation_engine import evaluate_lead
    from routing_workflows import trigger_high_priority_workflow, trigger_automated_handle_workflow
except Exception as e:
    print("Error importing modules:", e)

def main(json_payload_path):
    print("==================================================")
    print("🚀 Lexis-AI Orchestration Engine Initiated")
    print(f"📄 Processing Verified Payload: {json_payload_path}")
    print("==================================================")
    
    # Read the Payload
    try:
        with open(json_payload_path, 'r') as f:
            verified_data = json.load(f)
    except FileNotFoundError:
        print(f"[Error: Orchestrator] The verified JSON payload at {json_payload_path} could not be found.")
        return 
    
    # ------------------------------------------------------------------
    # Stage 0: Jurimetric Valuation
    # ------------------------------------------------------------------
    valuation_result = evaluate_lead(verified_data)
    
    if valuation_result["classification"] == "Standard/Nurture":
        trigger_automated_handle_workflow(verified_data)
        # Create as Lead in CRM, but skip matter + doc generation
        client_id = create_legal_contact(verified_data, current_refresh_token=None)
        print("\n==================================================")
        print("✅ SEQUENCER COMPLETE: Standard Lead Routed Automatically")
        print("==================================================")
        return
        
    if valuation_result["classification"] == "VIP/High-Yield":
        trigger_high_priority_workflow(verified_data, valuation_result["expected_value"])

    # ------------------------------------------------------------------
    # Stage 1: The Clio Skill (Create General CRM Entity)
    # ------------------------------------------------------------------
    client_id = create_legal_contact(verified_data, current_refresh_token=None)
    
    if not client_id:
        print("\n❌ 🚨 CRITICAL FAILURE 🚨")
        print("Clio Contact Sync Failed. The onboarding sequence has been aborted to prevent orphaned matters and orphaned legal documents.")
        # Calculate high risk due to failure for the alert
        notify_partner(verified_data | {"pms_client_id": "FAILED", "company_status": "ABORTED START"}, risk_score=100)
        return
        
    verified_data["pms_client_id"] = client_id
    
    # ------------------------------------------------------------------
    # Stage 2: The Clio Matter Sync
    # ------------------------------------------------------------------
    practice_area = verified_data.get("matter_details", {}).get("practice_area", "Corporate")
    matter_desc = verified_data.get("matter_details", {}).get("description", "Onboarding")
    
    matter_id = create_matter(client_id, practice_area=practice_area, matter_desc=matter_desc)
    
    if not matter_id:
        print("\n❌ 🚨 WORKFLOW PAUSED 🚨")
        print("Contact Created, but Matter initialization failed in Clio. Halting Engagement Letter Automation.")
        notify_partner(verified_data | {"pms_matter_id": "FAILED", "company_status": "ABORTED MATTER"}, risk_score=80)
        return
        
    verified_data["pms_matter_id"] = matter_id
    
    # ------------------------------------------------------------------
    # Stage 3: Document Automation Skill
    # ------------------------------------------------------------------
    print("\n[Orchestrator] Data structured correctly in PMS. Triggering Document Generation Engine...")
    
    doc_gen_path = os.path.join(os.path.dirname(__file__), ".agent", "skills", "doc-automation", "generate_letter.py")
    result = subprocess.run([sys.executable, doc_gen_path, json_payload_path], capture_output=True, text=True)
    
    if result.returncode != 0:
         print("\n❌ 🚨 WARNING 🚨")
         print("Engagement Letter generation explicitly failed.")
         print("Stdout:", result.stdout)
         print("Stderr:", result.stderr)
    else:
         print(result.stdout)
         
    # ------------------------------------------------------------------
    # Stage 4: Executive Briefing & Webhook Alert
    # ------------------------------------------------------------------
    # Dummy boolean check if 'address_match' exists, otherwise default Low risk if Verified
    aml_check = verified_data.get("verification_results", {}).get("aml_check", "")
    risk_score = 10 if "Verified" in aml_check else 85
    
    # Boost risk if status is not strictly active
    company_status = verified_data.get("verification_results", {}).get("status", "N/A").lower()
    if "active" not in company_status:
         risk_score += 40
         
    # Cap at 100 max
    risk_score = min(risk_score, 100)
    
    notify_partner(verified_data, risk_score)
    print("\n==================================================")
    print("✅ SEQUENCER COMPLETE: All Operations Executed Successfully")
    print("==================================================")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lexis-AI Orchestrator: Complete Onboarding Flow")
    parser.add_argument("payload", help="Path to the JSON verified summary generated by the Onboarding-Captain.")
    
    args = parser.parse_args()
    main(args.payload)
