import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load env variables including CLIO configuration
load_dotenv()

class ClioApiClient:
    """Base class for handling Clio PMS OAuth token refreshes and API interactions."""
    
    def __init__(self):
        self.client_id = os.getenv("CLIO_CLIENT_ID")
        self.client_secret = os.getenv("CLIO_CLIENT_SECRET")
        self.base_url = os.getenv("CLIO_BASE_URL", "https://eu.app.clio.com/api/v4")
        
        self.access_token = None
        self.refresh_token = None
        self.token_expiry = None

    def _is_token_expired(self):
        """Check if the current access token is expired or about to expire."""
        if not self.access_token or not self.token_expiry:
            return True
        # Add a 5-minute buffer before actual expiration
        return datetime.now() >= (self.token_expiry - timedelta(minutes=5))

    def refresh_access_token(self, stored_refresh_token):
        """Exchange the offline refresh token for a new short-lived access token."""
        # For EU, OAuth token lives at eu.app.clio.com 
        # Adapt accordingly depending on root region (app.clio.com for NA)
        token_url = "https://eu.app.clio.com/oauth/token"
        
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": stored_refresh_token
        }
        
        response = requests.post(token_url, data=payload)
        response.raise_for_status()
        
        data = response.json()
        
        self.access_token = data.get("access_token")
        self.refresh_token = data.get("refresh_token")
        expires_in = data.get("expires_in", 3600)  # Usually 1 hour
        
        self.token_expiry = datetime.now() + timedelta(seconds=expires_in)
        
        # In a production environment, this new refresh token MUST be saved persistently
        # back to the secure vault or database to be used on the next refresh cycle.
        return self.access_token, self.refresh_token

    def get_headers(self, current_refresh_token=None):
        """Construct authorization headers, refreshing the token automatically if needed."""
        if self._is_token_expired():
            if not current_refresh_token and not self.refresh_token:
                raise ValueError("Cannot refresh token without a valid refresh_token stored.")
            
            # Utilize the newly supplied token or fallback to our instance's memory
            token_to_use = current_refresh_token or self.refresh_token
            self.refresh_access_token(token_to_use)
            
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
    def request(self, method, endpoint, params=None, json_data=None, current_refresh_token=None):
        """Generic method to perform an API call to the Clio PMS."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = self.get_headers(current_refresh_token=current_refresh_token)
        
        response = requests.request(method, url, headers=headers, params=params, json=json_data)
        response.raise_for_status()
        
        return response.json()

def create_legal_contact(json_data, current_refresh_token=None):
    """
    Parses the Onboarding-Captain verified JSON report and syncs the data to Clio PMS.
    Takes (Name, Email, Company, Address) and checks for duplicates first.
    Returns the client_id established in the PMS.
    """
    client = ClioApiClient()
    
    client_name = json_data.get("client_info", {}).get("full_name")
    company_name = json_data.get("verification_results", {}).get("company_name")
    client_address = json_data.get("verification_results", {}).get("registered_address", json_data.get("client_info", {}).get("address"))
    email = json_data.get("client_info", {}).get("email") 
    
    is_company = bool(company_name and company_name != "N/A")
    contact_type = "Company" if is_company else "Person"
    search_query = company_name if is_company else client_name
    
    print(f"[PMS-Sync] Checking if {contact_type} '{search_query}' already exists in Clio...")
    
    # Check for empty tokens (Demonstration Mode)
    if not client.client_id or not client.client_secret:
        print(f"[PMS-Sync] ⚠️ No Clio credentials found in .env. Operating in DEMO MODE.")
        print(f"[PMS-Sync] Simulated Contact Creation for: {search_query}")
        return "MOCK_CLIENT_987654"

    # 1. Duplicate Check
    try:
        search_resp = client.request("GET", "contacts", params={"query": search_query}, current_refresh_token=current_refresh_token)
        existing_contacts = search_resp.get("data", [])
        
        if existing_contacts:
            found_id = existing_contacts[0].get("id")
            print(f"[PMS-Sync] Match found! Reusing existing Contact ID: {found_id}")
            return found_id
    except Exception as e:
        print(f"[PMS-Sync] Warning: Failed while searching for duplicate contacts: {e}")
        # Proceed to creation if we fail to search properly but the token was ok
        
    print(f"[PMS-Sync] No duplicate found. Creating new {contact_type} record...")
    
    # 2. Build Payload
    emails_payload = [{"address": email, "name": "Work"}] if email else []
    
    # Very rudimentary name splitting for Person
    first_name = None
    last_name = None
    if not is_company and client_name:
        parts = client_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""
        
    payload = {
        "data": {
            "type": contact_type,
            "name": company_name if is_company else None,
            "first_name": first_name,
            "last_name": last_name,
            "email_addresses": emails_payload,
            "addresses": [{"name": "Work", "street": client_address}] if client_address else []
        }
    }
    
    # Clean None values
    payload["data"] = {k: v for k, v in payload["data"].items() if v is not None}
    
    # 3. Create Contact
    try:
        create_resp = client.request("POST", "contacts", json_data=payload, current_refresh_token=current_refresh_token)
        new_contact_id = create_resp.get("data", {}).get("id")
        print(f"[PMS-Sync] Successfully created record! New Contact ID: {new_contact_id}")
        return new_contact_id
    except Exception as e:
        print(f"[PMS-Sync] Error creating PMS contact: {e}")
        return None
