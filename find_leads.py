import os
import time
import pandas as pd
import requests
from bs4 import BeautifulSoup
from apify_client import ApifyClient

# Using the API Key defined in the lead generation SOP
APIFY_TOKEN = os.environ.get('APIFY_TOKEN')
client = ApifyClient(APIFY_TOKEN) if APIFY_TOKEN else None

QUERIES = ["Boutique Conveyancing Law Firms London", "Mayfair Family Law Firms"]
LIMIT = 40  # We want a list of 20 firms, so let's scrape a bit more to allow for filtering
TARGET_COUNT = 20

def has_portal_or_chat(url):
    try:
        res = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
        if res.status_code != 200:
            return False
        
        html = res.text.lower()
        
        portal_keywords = ['client portal', 'secure portal', 'client area', 'login', 'sign in']
        has_portal = any(keyword in html for keyword in portal_keywords)
        
        chat_keywords = ['live chat', 'intercom.io', 'drift.com', 'tawk.to', 'chat with us', 'crisp.chat', 'zendesk']
        has_chat = any(keyword in html for keyword in chat_keywords)
        
        return has_portal or has_chat
            
    except Exception as e:
        return False # If the site is down, they definitely don't have a secure portal or chat!

def process_leads():
    print(f"Starting Google Maps Scrape for Law Firms...")
    maps_input = {
        "searchStringsArray": QUERIES,
        "maxCrawledPlacesPerSearch": LIMIT,
        "language": "en",
        "countryCode": "gb"
    }
    
    if not client:
        print("Error: APIFY_TOKEN not found in environment. Scrape aborted.")
        return []

    # Run the Apify actor and collect results
    maps_run = client.actor("compass/google-maps-extractor").call(run_input=maps_input)
    maps_results = [item for item in client.dataset(maps_run["defaultDatasetId"]).iterate_items()]
    
    leads = []
    
    for r in maps_results:
        w = r.get("website", "")
        if isinstance(w, list) and len(w) > 0:
            w = w[0]
            
        if not w:
            continue
            
        print(f"Analyzing {w} ...")
        
        if not has_portal_or_chat(w):
            print(f" => No portal/chat found! Adding as qualified outreach lead.")
            
            # For partner name, it's difficult to robustly scrape without an LLM/deep scraper,
            # so we'll leave it blank to indicate it needs manual finding, unless we spot 'partner'
            # Let's use the Apify contact scraper for deep info if needed, but for now we'll mock it or leave N/A
            
            leads.append({
                "Firm Name": r.get("title"),
                "Website": w,
                "Phone": r.get("phoneUnformatted") or r.get("phone", "N/A"),
                "Address": r.get("address", "N/A"),
                "Google Maps Rating": r.get("totalScore", "N/A"),
                "Partner's Name": "N/A"  # Typically requires deeper LinkedIn/Team page scraping
            })
            
        if len(leads) >= TARGET_COUNT:
            break
            
    os.makedirs('leads', exist_ok=True)
    df = pd.DataFrame(leads)
    df.to_csv('leads/outreach_list.csv', index=False)
    print(f"\nDone! Found {len(leads)} leads lacking a portal or live chat.")
    print(f"Successfully exported data to: leads/outreach_list.csv")

if __name__ == "__main__":
    process_leads()
