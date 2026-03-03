import time

def triage_property(address_string):
    """
    Simulates calling the HM Land Registry Business Gateway REST API.
    Returns a 'Property Pulse' report indicating tenure, ownership, and red flags.
    """
    print(f"\n[Property-Triage] Commencing HM Land Registry Check for: {address_string}")
    time.sleep(1) # Simulate HMLR Network Latency
    
    # Mock HMLR Title Register response based on the address
    is_leasehold = any(word in address_string.lower() for word in ["flat", "suite", "apartment", "unit"])
    
    pulse_report = {
        "title_number": "NGL" + str(hash(address_string) % 1000000).zfill(6),
        "tenure": "Leasehold" if is_leasehold else "Freehold",
        "registered_owner": "ROYAL LONDON ASSET MANAGEMENT LIMITED" if is_leasehold else "THE CROWN ESTATE",
        "mortgaged": True,
        "restrictions": ["Restriction: No disposition of the registered estate by the proprietor..."],
        "red_flags_present": True
    }
    
    print(f"[Property-Triage] 🏢 Title Match: {pulse_report['title_number']} | Tenure: {pulse_report['tenure']}")
    if pulse_report['red_flags_present']:
        print(f"[Property-Triage] ⚠️ RED FLAGS DETECTED: Property is subject to existing mortgages and restrictions.")
        
    return pulse_report
