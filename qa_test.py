import requests
import time

URL = "http://localhost:5001/chat"

def send_message(msg):
    print(f"\n[Test-Client] Sending: '{msg}'")
    response = requests.post(URL, json={"message": msg})
    if response.status_code == 200:
        reply = response.json().get('reply')
        
        # Remove HTML tags for cleaner console output
        import re
        clean_reply = re.sub('<[^<]+>', '', reply)
        
        print(f"[Onboarding-Captain] Reply: '{clean_reply}'")
        return clean_reply
    else:
        print(f"Error: Status Code {response.status_code}")
        return None

def reset_chat():
    requests.get("http://localhost:5001/")

def run_happy_path():
    print("\n\n--- Step 2: Functional Verification (Happy Path) ---")
    reset_chat()
    time.sleep(1)
    
    send_message("START")
    send_message("John Doe")
    send_message("1 Churchill Place, London, E14 5HP") # Barclays address
    final_reply = send_message("01026167") # Barclays PLC
    
    if final_reply and "Verification complete" in final_reply:
        print("✅ HAPPY PATH PASSED: Agent verified the company and address successfully.")
    else:
        print("❌ HAPPY PATH FAILED")

def run_skeptics_test():
    print("\n\n--- Step 3: Security & Edge Case Test (The Skeptic's Test) ---")
    reset_chat()
    time.sleep(1)
    
    send_message("START")
    send_message("Test Name")
    send_message("Test Address")
    final_reply = send_message("99999999") # Non-existent
    
    if final_reply and "Automated Compliance Assistant" in final_reply and "correct information" in final_reply:
        print("✅ SKEPTIC'S TEST PASSED: Agent applied legal-persona and gracefully asked for correct info without hallucinating.")
    else:
        print("❌ SKEPTIC'S TEST FAILED")

if __name__ == "__main__":
    run_happy_path()
    run_skeptics_test()
