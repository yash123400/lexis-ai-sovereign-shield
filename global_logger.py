import os
import time
from datetime import datetime
import json

LOG_FILE = os.path.join(os.path.dirname(__file__), 'logs', 'global_sync.log')
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

class GlobalErrorHandler:
    def __init__(self):
        self.error_catalog = {}

    def log_action(self, action_type, details):
        timestamp = datetime.utcnow().isoformat()
        log_entry = f"[{timestamp}] [TRACEABILITY] ACTION: {action_type} | DETAILS: {details}\n"
        with open(LOG_FILE, 'a') as f:
            f.write(log_entry)
        print(log_entry.strip())

    def log_error(self, error_type, details=""):
        timestamp = datetime.utcnow().isoformat()
        log_entry = f"[{timestamp}] [CRASH] ERROR: {error_type} | DETAILS: {details}\n"
        with open(LOG_FILE, 'a') as f:
            f.write(log_entry)
        print(log_entry.strip())
        
        # The No-Repeat Rule
        if error_type not in self.error_catalog:
            self.error_catalog[error_type] = 1
        else:
            self.error_catalog[error_type] += 1
            if self.error_catalog[error_type] >= 2:
                self.adjust_system_prompt(error_type)

    def adjust_system_prompt(self, error_type):
        timestamp = datetime.utcnow().isoformat()
        adjustment_msg = f"[{timestamp}] [SELF-HEALING] adjusting system_prompt to pre-emptively handle edge case: {error_type}"
        with open(LOG_FILE, 'a') as f:
            f.write(adjustment_msg + "\n")
        print(adjustment_msg)
        
        # Example dynamic prompt adjustment
        # system_prompt += f"\n- PRE-EMPTIVE INSTRUCTION: Do not fail on {error_type}. Apply recovery logic."

global_logger = GlobalErrorHandler()
