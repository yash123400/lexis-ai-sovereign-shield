import json
import sys
import os

import importlib.util

sys.path.append(os.path.join(os.path.dirname(__file__), ".agent", "skills"))

# Because the folder has a hyphen ('lead-valuation'), we can't do a standard from ... import.
# The easiest way within standard python is to use importlib or manipulate sys path again.
sys.path.append(os.path.join(os.path.dirname(__file__), ".agent", "skills", "lead-valuation"))

from valuation_engine import evaluate_lead
from routing_workflows import trigger_high_priority_workflow, trigger_automated_handle_workflow

def test_valuation_engine():
    # Mock data to trigger High Priority Workflow
    vip_lead = {
        "client_info": {
            "full_name": "Alexander Sterling",
        },
        "verification_results": {
            "company_name": "BARCLAYS PLC",
            "registered_address": "1 Churchill Place, Mayfair, London",
            "aml_check": "Verified via Companies House API 2026"
        },
        "matter_details": {
            "practice_area": "Commercial Property Dispute",
            "estimated_value": "£2,500,000"
        }
    }
    
    print("--- ⚖️ TESTING VIP/HIGH-YIELD VALUATION ---")
    vip_result = evaluate_lead(vip_lead)
    if vip_result["classification"] == "VIP/High-Yield":
        trigger_high_priority_workflow(vip_lead, vip_result["expected_value"])
        
    print("\n\n--- ⚖️ TESTING STANDARD/NURTURE VALUATION ---")
    standard_lead = {
        "client_info": {
            "full_name": "John Smith",
        },
        "verification_results": {
            "registered_address": "Bristol, UK",
        },
        "matter_details": {
            "practice_area": "General Inquiry",
            "estimated_value": "£1,000"
        }
    }
    standard_result = evaluate_lead(standard_lead)
    if standard_result["classification"] == "Standard/Nurture":
        trigger_automated_handle_workflow(standard_lead)

if __name__ == "__main__":
    test_valuation_engine()
