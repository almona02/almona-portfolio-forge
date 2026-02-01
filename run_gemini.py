import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure the Gemini API with your key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Create the model
model = genai.GenerativeModel('gemini-2.5-pro')

# Get prompt from the command line arguments
import sys
if len(sys.argv) > 1:
    prompt = ' '.join(sys.argv[1:])
    response = model.generate_content(prompt)
    print(response.text)
else:
    print("Please provide a prompt as a command-line argument.")
