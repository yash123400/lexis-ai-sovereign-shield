import feedparser
import json
from typing import Dict, List, Optional
from pydantic import BaseModel

class ProviderStatus(BaseModel):
    name: str # e.g. Clio
    status: str # e.g. Operational, Outage
    last_updated: str
    maintenance_msg: Optional[str]

class GlobalWatchman:
    """
    Intelligent External Status Monitor: Syncs Clio, MS Graph, and HMLR health.
    """
    
    CLIO_STATUS_RSS_URL = "https://status.clio.com/history.rss"
    MS_GRAPH_INCIDENT_API = "https://admin.microsoft.com/API/ServiceStatus" # Simulated for this demo

    def __init__(self):
        self.statuses: Dict[str, ProviderStatus] = {
            "Clio": ProviderStatus(**{"name": "Clio", "status": "Operational", "last_updated": "2026-02-28", "maintenance_msg": None}),
            "MS_Graph": ProviderStatus(**{"name": "MS_Graph", "status": "Operational", "last_updated": "2026-02-28", "maintenance_msg": None}),
            "HMLR": ProviderStatus(**{"name": "HMLR", "status": "Operational", "last_updated": "2026-02-28", "maintenance_msg": None})
        }

    def sync_hmlr_status(self) -> Dict:
        """
        Simulates data retrieval from Land Registry Business Gateway.
        """
        # In a real environment, this would check the HMLR technical status page
        # or ping the Business Gateway SOAP endpoint.
        try:
            self.statuses["HMLR"] = ProviderStatus(**{
                "name": "HMLR",
                "status": "Operational",
                "last_updated": "2026-02-28T12:30:00Z",
                "maintenance_msg": None
            })
        except Exception as e:
            print(f"Watchman - HMLR Sync Failed: {e}")
            
        return self.statuses["HMLR"].dict()

    def sync_clio_status(self) -> Dict:
        """
        Pulls latest data from Clio Status RSS.
        """
        try:
            # Parsing the RSS feed
            feed = feedparser.parse(self.CLIO_STATUS_RSS_URL)
            if feed.entries:
                latest = feed.entries[0]
                status_text = "Operational" if "resolved" in latest.title.lower() or "completed" in latest.title.lower() else "Incident"
                
                self.statuses["Clio"] = ProviderStatus(**{
                    "name": "Clio",
                    "status": status_text,
                    "last_updated": latest.published,
                    "maintenance_msg": latest.summary if status_text == "Incident" else None
                })
        except Exception as e:
            print(f"Watchman - Clio Sync Failed: {e}")
            
        return self.statuses["Clio"].dict()

    def get_routing_instruction(self) -> str:
        """
        Intelligent Routing: Detects global outages and suggests prestige messaging.
        """
        if self.statuses["Clio"].status != "Operational":
            return "ROUTE_TO_MAINTENANCE: Clio Gateway Outage Detected. Deploying 'Prestige Maintenance' overlay."
        
        if self.statuses["MS_Graph"].status != "Operational":
            return "ROUTE_TO_MAINTENANCE: MS Graph Auth Outage. Disabling Calendar Sync modules."

        if self.statuses["HMLR"].status != "Operational":
            return "ROUTE_TO_MAINTENANCE: HMLR Business Gateway Outage. Disabling Title Deed verification."
            
        return "ROUTE_NORMAL: All providers nominal."

# Simulated Execution
if __name__ == "__main__":
    watchman = GlobalWatchman()
    print("--- [LEXIS-AI GLOBAL WATCHMAN V2.0] ---")
    
    # Sync status
    clio_rep = watchman.sync_clio_status()
    print(f"Provider Status (Clio): {clio_rep['status']} - {clio_rep['last_updated']}")
    
    # Routing test
    print(f"Routing Instr: {watchman.get_routing_instruction()}")
