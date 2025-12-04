def generate_university_letter(university_name, dean_name):
    text = f"""
    Subject: Collaboration for "Digital Fabricator" Curriculum Development
    
    Dear Dean {dean_name},
    
    In alignment with Egypt Vision 2030's focus on bridging the gap between academia and industry, 
    Almona invites {university_name} to join the "National Smart Workshop" Consortium.
    
    We seek your academic leadership to validate our "Digital Fabricator" certification tracks. 
    Almona will provide the software labs and industry data; {university_name} will provide 
    the pedagogical accreditation.
    
    Together, we can create a new class of employable, tech-savvy industrial professionals 
    for the Egyptian market.
    """
    return text

def generate_industry_letter(company_name, ceo_name):
    text = f"""
    Subject: Partnership for National Industrial Modernization
    
    Dear {ceo_name},
    
    As a leader in the Egyptian industrial sector, {company_name} plays a pivotal role in our national economy.
    Almona Industrial Solutions is launching the "National Smart Workshop" pilot to modernize SME manufacturing.
    
    We invite {company_name} to participate as a Strategic Industry Partner, providing guidance and 
    supply chain integration opportunities for digitized workshops.
    """
    return text

# Usage
if __name__ == "__main__":
    print("--- University Partnership Letter ---")
    print(generate_university_letter("Cairo University", "Prof. Dr. Mohamed El-Kholy"))
    print("\n")
    print("--- Industry Partnership Letter ---")
    print(generate_industry_letter("El Sewedy Electric", "Eng. Ahmed El Sewedy"))


