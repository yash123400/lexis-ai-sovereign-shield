import sys
import os

# Ensure we can import the base PMS client
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "pms-integration"))
from pms_client import ClioApiClient
from datetime import datetime

def create_matter(client_id, practice_area="Corporate", matter_desc="Onboarding"):
    """
    Creates a new "Matter" in Clio under the specified client's ID.
    Naming convention: [YEAR]-[CLIENT_NAME]-Onboarding
    """
    client = ClioApiClient()
    
    print(f"[Clio-Sync] Attempting to create a new matter for Client ID: {client_id}")
    
    if not client.client_id or not client.client_secret:
        print(f"[Clio-Sync] ⚠️ No Clio credentials found in .env. Operating in DEMO MODE.")
        print(f"[Clio-Sync] Simulated Matter Creation - Property: {practice_area} | Desc: {matter_desc}")
        return "MOCK_MATTER_123456"
        
    try:
        # First, fetch the client to get their name for the matter description
        client_resp = client.request("GET", f"contacts/{client_id}")
        client_data = client_resp.get("data", {})
        
        # Determine the name to use in the matter title
        name = client_data.get("name")
        if not name:
            name = f"{client_data.get('first_name', '')} {client_data.get('last_name', '')}".strip()
            
        if not name:
            name = "Unknown_Client"
            
        current_year = datetime.now().year
        matter_title = f"{current_year}-{name}-{practice_area}"
        
        # Build the payload for the new matter
        payload = {
            "data": {
                "client": {"id": client_id},
                "description": matter_title,
                # In Clio, you may require a status or practice_area ID depending on setup.
                "status": "Open",
                "custom_field_values": [{"custom_field": {"id": 123}, "value": matter_desc}] # Mock
            }
        }
        
        # Send the creation request
        create_resp = client.request("POST", "matters", json_data=payload)
        new_matter_id = create_resp.get("data", {}).get("id")
        
        print(f"[Clio-Sync] Successfully created Matter! ID: {new_matter_id} | Name: {matter_title}")
        return new_matter_id
        
    except Exception as e:
        print(f"[Clio-Sync] Error creating matter: {e}")
        return None
