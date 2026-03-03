from flask import Flask, jsonify, request
from flask_cors import CORS
import sys
import os

# Adding skills/admin to path to import local modules
sys.path.append(os.path.join(os.path.dirname(__file__), ".agent", "skills", "admin"))
from aggregator import AggregatorEngine
from watchman import GlobalWatchman
from remediation import SovereignRepairEngine
from shield import SovereignShield
from clio_engine import ClioOAuthEngine

app = Flask(__name__)
# Task 2: Strict CORS. Wildcards (*) are blocked in 2026.
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}}) 

aggregator = AggregatorEngine()
watchman = GlobalWatchman()
shield = SovereignShield()
clio_oauth = ClioOAuthEngine()

# ZERO-TRUST ARCHITECT AUTH (Simulated)
ARCHITECT_SESSION = {
    "id": "ARCHITECT_01x88",
    "is_authorized": True
}

def require_shield(f):
    from flask import request, abort
    def wrapper(*args, **kwargs):
        # 1. IP INTELLIGENCE: Step-up Auth check
        ip = request.remote_addr
        if not shield.verify_ip_perimeter(ip):
            # Simulated Step-up push needed
            pass 
        
        # 2. Architect Identity
        if not ARCHITECT_SESSION["is_authorized"]:
            abort(404) # GHOST RULE: Never return 403, just vanish.
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

@app.route('/api/admin/firms', methods=['GET'])
@require_shield
def get_firms():
    shield.sign_action(ARCHITECT_SESSION["id"], "FETCH_FIRMS", "Viewing global aggregator wall.")
    firm_ids = ["LX-MAYFAIR-FB3", "LX-KENSINGTON-01", "LX-CITY-EMEA-02"]
    firms_data = []
    
    for fid in firm_ids:
        pulse = aggregator.get_sovereign_pulse(fid)
        # Enriching with some random/mock metrics that would come from the silo's status API
        firms_data.append({
            "id": fid,
            "name": pulse.get("name", fid.replace("LX-", "").replace("-", " ")),
            "region": "London, UK" if "LX" in fid else "Frankfurt, EU",
            "ev_ticker": f"£{pulse.get('ev', 100000 + (len(fid) * 5000))}",
            "sentinel_score": 85 + (len(fid) % 15),
            "oauth_status": 'healthy' if not pulse.get("drift_alert") else 'warning',
            "lead_velocity": 'spike' if fid == "LX-CITY-EMEA-02" else 'stable',
            "last_audit": pulse.get("timestamp", "2026-02-28 10:00:00"),
            "drift_alert": pulse.get("drift_alert"),
            "data_residency": "UK" if pulse.get("residency_verified") else "EMEA",
            "token_expiry": "1h 45m",
            "logs": [
                { "action": "OAUTH_HANDSHAKE_COMPLETE", "time": "10:00:15", "status": "SUCCESS", "pii_status": 'scrubbed' },
                { "action": "SENTINEL_PULSE_VERIFICATION", "time": "10:30:00", "status": "VERIFIED", "pii_status": 'scrubbed' }
            ]
        })
    return jsonify(firms_data)

@app.route('/api/admin/provider-status', methods=['GET'])
def get_provider_status():
    clio = watchman.sync_clio_status()
    hmlr = watchman.sync_hmlr_status()
    return jsonify({
        "clio": clio.get("status", "Online"),
        "ms": "Online",
        "hmlr": hmlr.get("status", "Online"),
        "routing": watchman.get_routing_instruction()
    })

@app.route('/api/admin/remediate/refresh', methods=['POST'])
@require_shield
def force_refresh():
    firm_id = request.json.get('firm_id')
    shield.sign_action(ARCHITECT_SESSION["id"], "OAUTH_REFRESH", f"Repairing {firm_id}")
    repair_engine = SovereignRepairEngine(firm_id)
    result = repair_engine.force_oauth_refresh()
    return jsonify(result)

@app.route('/api/admin/remediate/audit', methods=['POST'])
@require_shield
def redaction_audit():
    firm_id = request.json.get('firm_id')
    shield.sign_action(ARCHITECT_SESSION["id"], "PII_AUDIT", f"Running redaction review for {firm_id}")
    repair_engine = SovereignRepairEngine(firm_id)
    # Mock logs for audit
    sample_logs = [
        f"User 07700900123 initiated Clio fetch for client John Doe.",
        "System [Scrubbed] verified regulatory alignment for LX-Matter-99."
    ]
    results = repair_engine.run_pii_leak_guard_audit(sample_logs)
    # Convert Pydantic models to dicts
    return jsonify([r.dict() for r in results])

@app.route('/api/admin/impersonate', methods=['POST'])
@require_shield
def impersonate():
    firm_id = request.json.get('firm_id')
    reason = request.json.get('reason_code')
    result = shield.impersonate_firm(ARCHITECT_SESSION["id"], firm_id, reason)
    return jsonify(result)

@app.route('/api/admin/lockdown', methods=['POST'])
@require_shield
def global_lockdown():
    # Emergency Kill Switch
    result = shield.lockdown_protocol()
    shield.sign_action(ARCHITECT_SESSION["id"], "GLOBAL_LOCKDOWN", "ALL SILOS DISCONNECTED.")
    return jsonify(result)

# --- CLIO OAUTH DEBUGGER ROUTES ---

@app.route('/api/auth/clio/url', methods=['GET'])
@require_shield
def get_clio_auth_url():
    firm_id = request.args.get('firm_id')
    region = request.args.get('region', 'US')
    if not firm_id:
        return jsonify({"error": "Firm ID required"}), 400
    url = clio_oauth.generate_clio_auth_url(firm_id, region)
    return jsonify({"url": url})

@app.route('/api/auth/clio/callback', methods=['GET'])
def clio_callback():
    """Task 2 & 4: Redirect Guard and Handshake Verification."""
    error = request.args.get('error')
    if error == 'access_denied':
        # PRESTIGE ERROR: High-end rejection message
        return """
        <div style="background:#020202; color:#fff; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:serif;">
            <h1 style="font-size:3rem; letter-spacing:0.2em; border-bottom:1px solid #C5A059; padding-bottom:1rem;">ACCESS DENIED</h1>
            <p style="text-transform:uppercase; tracking:0.3em; color:#888;">Authorization was declined. Your Sovereign Silo remains inactive.</p>
        </div>
        """, 403

    code = request.args.get('code')
    state = request.args.get('state') # This is the firm_id
    
    if not code or not state:
        return jsonify({"error": "INVALID_HANDSHAKE", "message": "Incomplete authorization parameters."}), 400

    # In a real flow, we'd recover the region from session or database. 
    # For the debugger demo, we verify the firm_id matches state and exchange.
    result = clio_oauth.handle_clio_callback(code, state, state, 'US')
    
    return jsonify(result)

if __name__ == '__main__':
    # Running on a separate port (e.g. 5002) to avoid conflict with the chat app
    app.run(port=5002, debug=True)
