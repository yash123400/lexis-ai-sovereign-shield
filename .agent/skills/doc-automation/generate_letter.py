from docxtpl import DocxTemplate
import os
import json
from datetime import datetime

class LegalDocGenerator:
    """Populates Jinja2 DOCX templates with verified KYC data."""
    def __init__(self, template_path):
        self.template_path = template_path
        
    def generate_letter(self, json_data_path, output_dir):
        """Builds an engagement letter for the client and saves to output_dir."""
        # Read the verified JSON data from the Captain
        with open(json_data_path, 'r') as f:
            data = json.load(f)
            
        # Select the correct entity name
        company_name = data.get("verification_results", {}).get("company_name")
        client_name = data.get("client_info", {}).get("full_name")
        
        display_name = client_name if client_name else company_name
        
        # Prepare context payload for the Jinja engine
        context = {
            'date': datetime.now().strftime("%B %d, %Y"),
            'client_name': display_name,
            'company_address': data.get("verification_results", {}).get("registered_address"),
            'matter_practice_area': data.get("matter_details", {}).get("practice_area"),
            'matter_description': data.get("matter_details", {}).get("description")
        }
        
        # Hydrate the template
        doc = DocxTemplate(self.template_path)
        doc.render(context)
        
        # Save securely to vault
        os.makedirs(output_dir, exist_ok=True)
        filename = f"Engagement_Letter_{data.get('company_number', 'Unknown')}.docx"
        output_path = os.path.join(output_dir, filename)
        
        doc.save(output_path)
        print(f"[Doc-Automation] Engagement Letter successfully saved to: {output_path}")
        
        return output_path

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        json_file = sys.argv[1]
        
        # Adjust base directory relative to the current script
        base_dir = os.path.dirname(__file__)
        template = os.path.join(base_dir, 'templates', 'Engagement_Letter_Template.docx')
        
        # Store in root level /client_vault
        vault = os.path.join(base_dir, '..', '..', '..', 'client_vault') 
        
        gen = LegalDocGenerator(template)
        gen.generate_letter(json_file, vault)
