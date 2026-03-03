import os
import requests
import argparse
from dotenv import load_dotenv
import re

if os.getenv('VERCEL') != '1':
    load_dotenv()

API_KEY = os.getenv("COMPANIES_HOUSE_API_KEY")
print(f"SIGNAL: API Key mapped: {'*' * 8 + API_KEY[-4:] if API_KEY else 'MISSING'}")
BASE_URL = "https://api.company-information.service.gov.uk"

def search_company(query):
    url = f"{BASE_URL}/search/companies?q={query}"
    print(f"SIGNAL: Handshake initiated with CoHo Search API | Target: {query}")
    try:
        response = requests.get(url, auth=(API_KEY, ''), timeout=10)
        print(f"SIGNAL: CoHo Search Status: {response.status_code}")
        if response.status_code == 200:
            items = response.json().get('items', [])
            if items:
                comp_num = items[0].get('company_number')
                print(f"SIGNAL: Resolved {query} to {comp_num}")
                return comp_num
        else:
            print(f"ALERT: CoHo Search failed | Status: {response.status_code} | Body: {response.text[:100]}")
    except Exception as e:
        print(f"ALERT: CoHo Search exception | Error: {str(e)}")
    return None

def get_company_profile(company_number):
    url = f"{BASE_URL}/company/{company_number}"
    print(f"SIGNAL: Handshake initiated with CoHo Profile API | Target: {company_number}")
    try:
        response = requests.get(url, auth=(API_KEY, ''), timeout=10)
        print(f"SIGNAL: CoHo Profile Status: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"ALERT: CoHo Profile failed | Status: {response.status_code} | Body: {response.text[:100]}")
    except Exception as e:
        print(f"ALERT: CoHo Profile exception | Error: {str(e)}")
    return None

def get_company_officers(company_number):
    url = f"{BASE_URL}/company/{company_number}/officers"
    response = requests.get(url, auth=(API_KEY, ''))
    if response.status_code == 200:
        return response.json().get('items', [])
    return []

def check_disqualification(officer_name):
    # Using the name to search the disqualified officers endpoint
    url = f"{BASE_URL}/search/disqualified-officers?q={officer_name}"
    response = requests.get(url, auth=(API_KEY, ''))
    if response.status_code == 200:
        results = response.json().get('items', [])
        return len(results) > 0
    return False

def check_compliance(input_query):
    # Determine if input is a company number or a name
    company_number = input_query
    if not re.match(r'^[A-Z0-9]{8}$', input_query):
        print(f"Searching for company: {input_query}...")
        company_number = search_company(input_query)
        if not company_number:
            print("Error: Company not found.")
            return
        
    profile = get_company_profile(company_number)
    if not profile:
        print(f"Error: Company {company_number} not found or API error.")
        return

    print("\n--- UK Compliance Check ---")
    print(f"Company Number: {company_number}")
    print(f"Company Name: {profile.get('company_name')}")
    print(f"Status: {profile.get('company_status', 'Unknown').upper()}")
    
    address = profile.get('registered_office_address', {})
    address_str = ", ".join(filter(None, [
        address.get('address_line_1'),
        address.get('address_line_2'),
        address.get('locality'),
        address.get('postal_code')
    ]))
    print(f"Registered Address: {address_str}")

    officers = get_company_officers(company_number)
    active_directors = [o for o in officers if o.get('officer_role') == 'director' and not o.get('resigned_on')]
    
    print("\nActive Directors:")
    high_risk = False
    
    if not active_directors:
        print(" - No active directors found.")
    else:
        for director in active_directors:
            name = director.get('name')
            print(f" - {name}")
            if check_disqualification(name):
                print("   [!] WARNING: Director may be disqualified according to the register!")
                high_risk = True

    print("\n--- Compliance Result ---")
    if high_risk:
        print("RISK LEVEL: HIGH RISK (Disqualified director match found)")
    else:
        print("RISK LEVEL: LOW/NORMAL")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check UK Company compliance using Companies House API.")
    parser.add_argument("query", help="The UK Company Number or Company Name")
    args = parser.parse_args()
    
    if not API_KEY:
        print("Please set COMPANIES_HOUSE_API_KEY in your .env file.")
    else:
        check_compliance(args.query)
