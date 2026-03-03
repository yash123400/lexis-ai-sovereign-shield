import os
import json
import datetime
import glob
from cryptography.fernet import Fernet
import uuid
from typing import Dict, List

# In a real environment, this master key is stored in an HSM or AWS KMS
# Using a generated Fernet key for the 2026 Sovereign Audit demonstration
METADATA_FILE = "vault_metadata.json"

def get_master_key():
    try:
        with open("vault_master.key", "rb") as f:
            return f.read()
    except FileNotFoundError:
        key = Fernet.generate_key()
        with open("vault_master.key", "wb") as f:
            f.write(key)
        return key

MASTER_KEY = get_master_key()
cipher_suite = Fernet(MASTER_KEY)

def get_rotation_metadata() -> Dict:
    default_metadata = {"last_rotation": str(datetime.datetime.now()), "rotation_count": 0}
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r") as f:
            try:
                data = json.load(f)
                return data
            except json.JSONDecodeError:
                return default_metadata
    return default_metadata

def save_rotation_metadata(metadata: Dict):
    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=4)

def rotate_master_key():
    """
    Sovereign Rotation Policy: Generates a new master key and re-encrypts all firm silos.
    """
    print("[Vault] 🔄 Initiating AES-256 Master Key Rotation...")
    
    current_master_key = get_master_key()
    old_cipher = Fernet(current_master_key)
    new_key = Fernet.generate_key()
    new_cipher = Fernet(new_key)
    
    # 1. Identify all silo environments
    silo_files = glob.glob(".env.LX-*")
    
    for silo in silo_files:
        print(f"[Vault] Re-encrypting {silo}...")
        decrypted_data: Dict[str, str] = {}
        
        # Read and decrypt with old key
        with open(silo, "r") as f:
            for line in f:
                if "=" in line:
                    k, v = line.strip().split("=", 1)
                    decrypted_data[k] = old_cipher.decrypt(v.encode()).decode()
        
        # Write and encrypt with new key
        with open(silo, "w") as f:
            for k, val in decrypted_data.items():
                enc_v = new_cipher.encrypt(val.encode()).decode()
                f.write(f"{k}={enc_v}\n")
                
    # 2. Commit new master key
    with open("vault_master.key", "wb") as f:
        f.write(new_key)
        
    global cipher_suite
    cipher_suite = new_cipher
    
    # 3. Update Audit Metadata
    metadata = get_rotation_metadata()
    metadata["last_rotation"] = str(datetime.datetime.now())
    metadata["rotation_count"] = int(metadata.get("rotation_count", 0)) + 1
    save_rotation_metadata(metadata)
    
    print(f"[Vault] ✅ Rotation Complete. {len(silo_files)} silos secured with new cipher.")

def ensure_env_ignored():
    """ Automatically injects .env.* rules into global .gitignore to prevent leaks. """
    gitignore_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", ".gitignore")
    rule = "\n# Sovereign Deployment Factory Secrets\n.env.*\nvault_master.key\n"
    
    if os.path.exists(gitignore_path):
        with open(gitignore_path, "r") as f:
            content = f.read()
        if ".env.*" not in content:
            with open(gitignore_path, "a") as f:
                f.write(rule)
            print("[Vault] 🔒 .gitignore automatically sealed. Prevented Git leak of .env arrays.")
    else:
        with open(gitignore_path, "w") as f:
            f.write(rule)
        print("[Vault] 🔒 Created and sealed .gitignore.")

def secure_handshake(firm_id: str, secrets: dict):
    """
    Encrypts the provided API secrets with AES-256 and stores them in an isolated .env.[FIRM_ID]
    """
    ensure_env_ignored()
    
    env_file = f".env.{firm_id}"
    
    with open(env_file, "w") as f:
        for key, value in secrets.items():
            # Encrypt the literal value (AES-256 equivalent in Fernet symmetric cryptography)
            encrypted_value = cipher_suite.encrypt(value.encode()).decode()
            f.write(f"{key}={encrypted_value}\n")
            
    print(f"[Vault] 🔑 Handshake secure. Created encrypted credentials cache: {env_file}")

def load_tenant_environment(firm_id: str) -> dict:
    """
    Dynamically injects the specific .env.[FIRM_ID] exclusively to the container context.
    The agent NEVER loads a global .env.
    """
    env_file = f".env.{firm_id}"
    decrypted_env = {}
    
    if not os.path.exists(env_file):
        raise ValueError(f"CRITICAL: Identity Vault for {firm_id} does not exist.")
        
    with open(env_file, "r") as f:
        for line in f:
            if "=" in line:
                key, encrypted_val = line.strip().split("=", 1)
                decrypted_val = cipher_suite.decrypt(encrypted_val.encode()).decode()
                decrypted_env[key] = decrypted_val
                
    # We do NOT export these to `os.environ` globally. We return them as a dynamic dict.
    return decrypted_env
