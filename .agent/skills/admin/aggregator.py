import datetime
import random
import json
import os
from typing import List, Dict, Optional
from pydantic import BaseModel

class FirmMetadata(BaseModel):
    firm_id: str
    name: str
    region: str
    data_residency: str
    oauth_expiry: datetime.datetime
    clio_version_header: str
    lead_volume_history: List[int]
    sentinel_audit_count: int
    last_heartbeat: datetime.datetime

class AggregatorEngine:
    """
    Sovereign Aggregator: Pulls metadata from isolated silos and flags anomalies.
    """
    
    GOLD_STANDARD_CLIO_VERSION = "2026-01-Alpha"
    LEAD_SPIKE_THRESHOLD = 3.0  # 300%

    def __init__(self, vault_path: str = "/vault/"):
        self.vault_path = vault_path
        self.firms: Dict[str, FirmMetadata] = {}

    def fetch_heartbeat(self, firm_id: str) -> Dict:
        """
        Simulates pulling a heartbeat from an isolated firm container.
        In a real scenario, this would be a cross-container secure API call.
        """
        # Mock logic to represent metadata retrieval
        return {
            "firm_id": firm_id,
            "timestamp": datetime.datetime.now().isoformat(),
            "status": "HEALTHY",
            "clio_header": "2026-01-Alpha",
            "server_loc": "UK-WEST-1"
        }

    def check_api_drift(self, current_header: str) -> bool:
        """Flags if the provider has rolled out a new API version (Drift)."""
        return current_header != self.GOLD_STANDARD_CLIO_VERSION

    def check_token_lifespan(self, expiry: datetime.datetime) -> str:
        """
        Monitors OAuth token lifespan.
        Returns 'AMBER' if within 2 hours of expiry.
        """
        time_left = expiry - datetime.datetime.now()
        hours_left = time_left.total_seconds() / 3600
        
        if hours_left < 2:
            return "AMBER"
        return "GREEN"

    def detect_lead_velocity_anomaly(self, history: List[int]) -> bool:
        """Triggers alert if recent volume spikes >300%."""
        if len(history) < 2:
            return False
        
        last_hour = history[-1]
        history_slice = history[:-1]
        previous_avg = sum(history_slice) / len(history_slice)
        
        if previous_avg == 0: return last_hour > 10
        
        return (last_hour / previous_avg) > self.LEAD_SPIKE_THRESHOLD

    def get_sovereign_pulse(self, firm_id: str) -> Dict:
        """
        Analyzes a firm's container for security and residency health.
        """
        metadata = self.fetch_heartbeat(firm_id)
        
        health_report = {
            "firm_id": firm_id,
            "drift_alert": self.check_api_drift(metadata["clio_header"]),
            "residency_verified": metadata["server_loc"].startswith("UK"),
            "system_status": "OPERATIONAL"
        }
        
        return health_report

# Example Usage / Test
if __name__ == "__main__":
    aggregator = AggregatorEngine()
    print(f"--- [LEXIS-AI ADMIN AGGREGATOR] ---")
    pulse = aggregator.get_sovereign_pulse("LX-MAYFAIR-FB3")
    print(json.dumps(pulse, indent=4))
    
    # Test Anomaly Detection
    history = [10, 12, 11, 45] # Spike from 11 to 45 (>300%)
    if aggregator.detect_lead_velocity_anomaly(history):
        print("ALERT: Lead Velocity Spike Detected!")
