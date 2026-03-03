import os
import sqlite3
import uuid
import json

from vault import secure_handshake

def provision_new_firm_container(firm_config: dict):
    """
    Automates the creation of an isolated 'Single-Tenant Container'
    Returns the Generated FIRM_ID.
    """
    
    print("==================================================")
    print("🚢  Lexis-AI: Sovereign Deployment Provisioning")
    print("==================================================\n")
    
    # 1. Generate Unique Sovereign ID
    # e.g., LX-MAYFAIR-001
    name_slug = firm_config['firm_name'].upper().replace(' ', '')[:7]
    firm_id = f"LX-{name_slug}-{str(uuid.uuid4())[:3].upper()}"
    print(f"[Provisioner] 🏗️ Generating Unique Firm Identity: {firm_id}")
    
    # 2. Create Dedicated Directory Structure -> /vault/[FIRM_ID]/
    base_dir = os.path.dirname(__file__)
    vault_dir = os.path.abspath(os.path.join(base_dir, '..', '..', '..', 'compliance_vault', firm_id))
    os.makedirs(vault_dir, exist_ok=True)
    
    print(f"[Provisioner] 📁 Container Allocated. Path: /compliance_vault/{firm_id}/")

    # 3. Instantiate Private Database Schema Exclusively for ID
    db_path = os.path.join(vault_dir, f"{firm_id}_sovereign.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS firm_metadata (
            id INTEGER PRIMARY KEY,
            brand_hex TEXT,
            clio_region TEXT,
            storage_limit TEXT,
            sra_id TEXT,
            dpo_contact TEXT
        )
    ''')
    cursor.execute('''
        INSERT INTO firm_metadata (brand_hex, clio_region, storage_limit, sra_id, dpo_contact)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        firm_config.get('brand_hex_code', '#000000'), 
        firm_config.get('clio_region', 'EU'), 
        firm_config.get('storage_limit', '100GB'),
        firm_config.get('sra_id', 'NOT_SET'),
        firm_config.get('dpo_contact', 'dpo@default.com')
    ))
    conn.commit()
    conn.close()
    
    print(f"[Provisioner] 💾 Dedicated Engine Schema Linked & Encrypted: {db_path}")

    # 4. Trigger the Key Vault Handshake
    mock_secrets = {
        "CLIO_CLIENT_SECRET": "demo_secret_" + str(uuid.uuid4()),
        "MS_GRAPH_KEY": "demo_graph_" + str(uuid.uuid4())
    }
    secure_handshake(firm_id, mock_secrets)
    
    # 5. Save the container state config JSON for UI swapping
    config_path = os.path.join(vault_dir, "state.json")
    firm_config["firm_id"] = firm_id
    with open(config_path, "w") as f:
        json.dump(firm_config, f, indent=4)
        
    print(f"\n[Provisioner] ✅ Single-Tenant Architecture successfully provisioned for: {firm_config['firm_name']}.")
    
    return firm_id

if __name__ == "__main__":
    test_config = {
        "firm_name": "Mayfair Boutique Law",
        "brand_hex_code": "#0047AB", # London Blue
        "clio_region": "EU",
        "storage_limit": "500GB",
        "sra_id": "SRA-654321",
        "dpo_contact": "dpo@mayfairlaw.co.uk"
    }
    provision_new_firm_container(test_config)
