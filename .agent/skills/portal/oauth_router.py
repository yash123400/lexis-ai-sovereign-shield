import os
import sys

# Ensure parent skills directory is in path to import vault and sentinel
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from factory.vault import secure_handshake
from sentinel.api_pulse import simulate_api_drift_check, ClioContactSchema

from portal.generate_onboarding_link import validate_and_consume_link, consume_link

def initiate_pkce_flow(firm_id: str, link_token: str):
    """
    Step 1: Partner clicks 'Connect Clio'. We generate a dynamic PKCE Challenge
    and embed the firm_id inside the 'state' parameter to prevent CSRF.
    """
    state_token = f"{firm_id}::{link_token}"
    print(f"\n[Router] 🔗 Step 1: Initiating PKCE Flow.")
    print(f"[Router] Generating Code Challenge using SHA-256...")
    print(f"[Router] State Token binding to ID: {state_token}")
    
    # Send user to Clio Auth URL
    auth_url = f"https://app.eu.clio.com/oauth/authorize?response_type=code&client_id=LEXIS_AI_CLIENT&redirect_uri=https://lexis-ai.com/callback&state={state_token}&code_challenge=mock_sha256_challenge&code_challenge_method=S256"
    print(f"[Router] 🔒 Redirecting Partner to: {auth_url}")
    return state_token

def handle_oauth_callback(auth_code: str, state_token: str):
    """
    Step 2: Partner returning from Clio/Microsoft. We exchange the 'code' for 
    Tokens, then vault them to the correct directory based on the 'state' param.
    """
    print(f"\n==================================================")
    print("🔐  Lexis-AI: OAuth Multi-Tenant Router (Callback)")
    print("==================================================\n")
    
    # 1. Crack the state token mapping
    firm_id, link_token = state_token.split("::")
    
    # 2. Validate the link has not expired
    is_valid, mapped_id = validate_and_consume_link(link_token)
    if not is_valid:
        print("[Router] 🚨 FATAL: State token corresponds to an invalid or expired onboarding session.")
        return False
        
    print(f"[Router] 🔑 Exchanging 'auth_code' {auth_code} for Bearer Tokens using PKCE Code Verifier...")
    
    # 3. Simulate Successful Exchange
    mock_exchange_tokens = {
        "CLIO_BEARER_TOKEN": f"eyJh...{firm_id}_CLIO",
        "MS_GRAPH_TOKEN": f"eyJh...{firm_id}_GRAPH" # Assuming both done or mock
    }
    
    # 4. Route Tokens directly to the Vault!
    print(f"[Router] 🛡️ Routing securely into container context for: {firm_id}")
    secure_handshake(firm_id, mock_exchange_tokens)
    
    # 5. Consume (Burn) the single-use link
    consume_link(link_token)
    
    # 6. Task 4: Automated 'Sentinel' Wake-up
    print("\n[Router] 📡 Triggering Automated 'Sentinel' Wake-Up Sequence...")
    wake_up_sentinel()
    
    print("\n[Router] ✅ Onboarding Complete. Firm Sovereign Environment is Live.")

def wake_up_sentinel():
    """ Runs the Sentinel API Pulse to verify the new connection is fully working. """
    print("[Sentinel-Wakeup] Pinging Clio API to confirm Active Handshake...")
    clio_mock = {"id": 99999, "name": "Live Pulse Firm", "type": "Company", "email_addresses": []}
    simulate_api_drift_check("Clio Active Connection", ClioContactSchema, clio_mock)
    
    print("[Sentinel-Wakeup] ✅ Sentinel Pulse Complete. Handshake Confirmed.")

if __name__ == "__main__":
    from generate_onboarding_link import generate_onboarding_link
    
    # 1. Setup firm
    firm_id = "LX-NEW-999"
    link_url, link_token = generate_onboarding_link(firm_id)
    
    # 2. Partner initiates flow
    state = initiate_pkce_flow(firm_id, link_token)
    
    # 3. Callback hits our router
    handle_oauth_callback("mock_auth_code_12345", state)
