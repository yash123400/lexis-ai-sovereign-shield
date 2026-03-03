import os
import re
import shutil
import hashlib
from datetime import datetime

# Define directories to scan
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

# Typical spots for PII leaks
LOG_DIR = os.path.join(BASE_DIR, "logs")
TEMP_DIR = os.path.join(BASE_DIR, "temp")
VAULT_DIR = os.path.join(BASE_DIR, "compliance_vault")

os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(VAULT_DIR, exist_ok=True)

# Regex patterns for secrets & PII
SECRET_PATTERNS = [
    r'clio_secret_?=(?:[\"\'\s]+)?([A-Za-z0-9\-\_]{32,})', # Clio Secrets
    r'(?i)azure_key_?=(?:[\"\'\s]+)?([A-Za-z0-9\-\_]{32,})' # Azure Keys
]

PII_PATTERNS = [
    r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', # Email
    r'(?:\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}' # UK Phone numbers (Basic)
]

def scan_file_for_liabilities(file_path: str):
    """
    Scans a log/temp file for hardcoded secrets and unencrypted PII.
    Redacts the PII and quarantines the file into the compliance vault if breached.
    """
    breach = False
    
    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()
        
    original_content = content

    # 1. Hardcoded Secrets Check
    for pattern in SECRET_PATTERNS:
        match = re.search(pattern, content)
        if match:
            print(f"[Sec-Audit] ⚠️ CRITICAL: Hardcoded API Secret detected in {os.path.basename(file_path)}!")
            # Wipe it outright
            content = re.sub(pattern, "[SECRET_REDACTED_BY_SENTINEL]", content)
            breach = True
            
    # 2. PII Scrub
    for pattern in PII_PATTERNS:
        # Find all matches before replacing, so we can log them (securely)
        matches = re.findall(pattern, content)
        if matches:
            for pii in matches:
                # Replace with the SRA-compliant SHA-256 hash instead of leaving it in plain text
                secure_hash = "SHA256-" + hashlib.sha256(pii.encode()).hexdigest()[:15]
                content = content.replace(pii, secure_hash)
            
            print(f"[Sec-Audit] ⚠️ PII BREACH DETECTED: Found unencrypted data in {os.path.basename(file_path)}!")
            breach = True

    if breach:
        print("[Sec-Audit] -> Redacting and transferring to /compliance_vault/")
        # Overwrite the original
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(content)
            
        # Move the newly "clean" version to the Vault for audit
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        safe_name = f"redacted_{timestamp}_{os.path.basename(file_path)}"
        shutil.move(file_path, os.path.join(VAULT_DIR, safe_name))
        
        return True # Handled a breach
        
    return False # No issues

def mock_pii_generation():
    """ Creates a mock log with PII for the scanner to find. """
    mock_file = os.path.join(LOG_DIR, "debug_trace.log")
    with open(mock_file, "w") as f:
        f.write("User connection established.\n")
        f.write("DEBUG data payload: alexander.sterling@sterling-holdings.co.uk.\n")
        f.write("Phone contact: +44 7700 900123\n")
        f.write("clio_secret=29b0aab3-8eac-4a25-abe9-1v2b3n4m5m6m\n")

def run_security_sweep():
    print("==================================================")
    print("🛡️  Lexis-AI: Sentinel Security 'Shift-Left' Sweeper")
    print("==================================================\n")
    
    mock_pii_generation() # Seed the liability
    
    scan_targets = [os.path.join(LOG_DIR, f) for f in os.listdir(LOG_DIR)] + \
                   [os.path.join(TEMP_DIR, f) for f in os.listdir(TEMP_DIR)]
                   
    breaches_found = 0
    
    for target in scan_targets:
        if os.path.isfile(target): # Only scan actual files
            if scan_file_for_liabilities(target):
                breaches_found += 1
                
    if breaches_found == 0:
        print("[Sec-Audit] ✅ Clean Sweep. All internal directories are Sovereign secure.")
    else:
        print(f"\n[Sec-Audit] ⚠️ Automated Fix Applied: {breaches_found} file(s) scrubbed and vaulted.")
        
    print("\n[Dependency-Audit] 📦 'pip-audit' execution sequence simulated (Mocked CVEs = 0).")

if __name__ == "__main__":
    run_security_sweep()
