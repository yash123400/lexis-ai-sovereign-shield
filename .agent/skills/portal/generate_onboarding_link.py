import os
import uuid
import json
from datetime import datetime, timedelta

def generate_onboarding_link(firm_id: str):
    """
    Creates a unique, high-security, single-use URL for a Law Partner.
    Links expire after 24 hours or after one successful 'Handshake'.
    """
    print(f"\n[Auth-Gen] 🔐 Generating Sovereign Onboarding Portal Link for {firm_id}")
    
    base_dir = os.path.dirname(__file__)
    links_dir = os.path.abspath(os.path.join(base_dir, '..', '..', '..', 'compliance_vault', 'active_links'))
    os.makedirs(links_dir, exist_ok=True)
    
    # Generate Cryptographic Link Token
    link_token = str(uuid.uuid4())
    
    expiration = datetime.utcnow() + timedelta(hours=24)
    
    link_metadata = {
        "firm_id": firm_id,
        "token": link_token,
        "expires_at": expiration.isoformat() + "Z",
        "status": "valid" # Becomes 'consumed' after 1 use
    }
    
    # Store token state
    state_file = os.path.join(links_dir, f"{link_token}.json")
    with open(state_file, "w") as f:
        json.dump(link_metadata, f, indent=4)
        
    onboarding_url = f"https://onboard.lexis-ai.com/secure/{link_token}"
    
    print(f"[Auth-Gen] ✅ Secure Link Generated:")
    print(f"👉 {onboarding_url}")
    print(f"⏱️  Expires: {link_metadata['expires_at']} (Single-Use Only)")
    
    return onboarding_url, link_token

def validate_and_consume_link(token: str):
    """ Validates the 24 hour window and single-use constraint. """
    base_dir = os.path.dirname(__file__)
    state_file = os.path.abspath(os.path.join(base_dir, '..', '..', '..', 'compliance_vault', 'active_links', f"{token}.json"))
    
    if not os.path.exists(state_file):
        print(f"[Auth-Gen] 🚨 ERROR: Link token {token} does not exist.")
        return False, None
        
    with open(state_file, "r") as f:
        metadata = json.load(f)
        
    if metadata["status"] != "valid":
        print("[Auth-Gen] 🚨 ERROR: Sovereign Link has already been consumed.")
        return False, None
        
    expiration = datetime.fromisoformat(metadata["expires_at"].replace("Z", ""))
    if datetime.utcnow() > expiration:
        print("[Auth-Gen] 🚨 ERROR: Sovereign Link has expired (24h TTL).")
        metadata["status"] = "expired"
        with open(state_file, "w") as f:
            json.dump(metadata, f, indent=4)
        return False, None
        
    # Valid - we do not consume it until the OAuth handshake finishes in the router
    print(f"[Auth-Gen] ✅ Link Token {token} is Valid for Firm ID: {metadata['firm_id']}")
    return True, metadata["firm_id"]

def consume_link(token: str):
    """ Permanently burns the link so it cannot be reused. """
    base_dir = os.path.dirname(__file__)
    state_file = os.path.abspath(os.path.join(base_dir, '..', '..', '..', 'compliance_vault', 'active_links', f"{token}.json"))
    if os.path.exists(state_file):
        with open(state_file, "r") as f:
            metadata = json.load(f)
        metadata["status"] = "consumed"
        with open(state_file, "w") as f:
            json.dump(metadata, f, indent=4)
        print(f"[Auth-Gen] 🔥 Link Token {token} permanently consumed. Sovereign boundary sealed.")

if __name__ == "__main__":
    generate_onboarding_link("LX-TEST-001")
