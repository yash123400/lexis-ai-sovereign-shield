import os
import json
import uuid
from datetime import datetime

class LeadValuationEngine:
    """
    Jurimetric Valuation Engine.
    Uses financial logic and 2026 London Guideline Hourly Rates (GHR) to prioritize high-value matters.
    Outputs a valuation_report.json artifact.
    """
    def __init__(self):
        # Base directory for the financial artifacts
        base_dir = os.path.dirname(__file__)
        self.reports_dir = os.path.abspath(os.path.join(base_dir, '..', '..', '..', 'reports', 'financials'))
        os.makedirs(self.reports_dir, exist_ok=True)

    def calculate_score(self, practice_area, company_turnover, location, estimated_claim_val, is_director_verified=False):
        """
        Executes a weighted-sum model.
        Returns the overall Score (0-100) and the Expected Value ($EV).
        """
        print(f"\n[Lead-Valuation] ⚖️ Calculating Jurimetric Valuation...")
        
        score = 0
        probability_of_success = 0.5 # Baseline
        
        # 1. Claim Value Weights
        try:
            val = float(str(estimated_claim_val).replace("£", "").replace(",", "").replace("$", ""))
        except:
            val = 0
            
        if val > 1_000_000:
            score += 40
            probability_of_success = 0.6
        elif val > 100_000:
            score += 20
        else:
            score += 5
            
        # 2. Practice Area Weights
        pa = str(practice_area).lower()
        if "commercial" in pa or "dispute" in pa or "litigation" in pa:
            score += 30
        elif "conveyancing" in pa or "property" in pa:
            score += 15
        else:
            score += 5
            
        # 3. Location Weights (Dynamic Premium Zones via Environment Variables)
        # Prevents hardcoding firm-specific 'Premium Zones' into the Core Engine
        loc = str(location).lower()
        default_zones = "mayfair,w1,city,bank,ec1,ec2,wc1"
        hotspots = [z.strip().lower() for z in os.environ.get("FIRM_HOTSPOT_ZONES", default_zones).split(",")]

        if any(hotspot in loc for hotspot in hotspots):
            score += 20
            probability_of_success += 0.1
        elif "london" in loc:
            score += 10
            
        # 4. Identity & Verification
        if is_director_verified:
            score += 10
            probability_of_success += 0.05
            
        # Normalize and Cap Score
        final_score = min(max(int(score), 0), 100)
        
        # Financial Expected Value Calculation: $EV = (Potential Fee * Prob of Success)
        # Using 2026 London GHR Average of approx 10% total claim value as fee estimate for disputes
        potential_fee = val * 0.10
        expected_value = potential_fee * probability_of_success
        
        print(f"[Lead-Valuation] Score calculated: {final_score}/100. Expected Fee Value: £{expected_value:,.2f}")
        return final_score, expected_value
        
    def generate_report(self, client_data, score, expected_value, classification):
        """
        Creates the valuation_report.json artifact for monthly BD reviews.
        """
        report_id = uuid.uuid4().hex[:8]
        
        report = {
            "valuation_id": f"VAL-{report_id}",
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "client_name": client_data.get("full_name") or client_data.get("client_name"),
            "company": client_data.get("company_name", "N/A"),
            "metrics": {
                "jurimetric_score": score,
                "expected_value_gbp": expected_value,
                "classification": classification
            },
            "parameters": {
                "practice_area": client_data.get("practice_area"),
                "claim_value": client_data.get("estimated_value"),
                "location": client_data.get("registered_address", client_data.get("client_address")),
                "director_verified": client_data.get("director_verified", False)
            }
        }
        
        filename = f"valuation_{report_id}_{client_data.get('company_number', 'unknown')}.json"
        filepath = os.path.join(self.reports_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=4)
            
        print(f"[Lead-Valuation] 📊 Financial Artifact generated at: {filepath}")
        return filepath

# Instantiate simple helper function for orchestration
def evaluate_lead(client_data):
    engine = LeadValuationEngine()
    
    # Extract
    pa = client_data.get("matter_details", {}).get("practice_area", client_data.get("practice_area", "General Inquiry"))
    val = client_data.get("matter_details", {}).get("estimated_value", client_data.get("estimated_value", 0))
    loc = client_data.get("verification_results", {}).get("registered_address", client_data.get("client_address", ""))
    turnover = client_data.get("turnover", 0) # Assumes extracted from CH
    is_verified = "Verified" in client_data.get("verification_results", {}).get("aml_check", "")
    
    score, ev = engine.calculate_score(pa, turnover, loc, val, is_director_verified=is_verified)
    
    # Environment Variable / Feature Flag Overrides (Decoupling logic from Core)
    vip_threshold = int(os.environ.get("VIP_SCORE_THRESHOLD", 80))
    nurture_threshold = int(os.environ.get("NURTURE_SCORE_THRESHOLD", 30))
    
    classification = "VIP/High-Yield" if score > vip_threshold else ("Standard/Nurture" if score < nurture_threshold else "Moderate")
    
    report_path = engine.generate_report(client_data, score, ev, classification)
    
    return {
        "score": score,
        "classification": classification,
        "expected_value": ev,
        "report_path": report_path
    }
