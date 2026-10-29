
import os
from dotenv import load_dotenv
from qpiai_quantum import QpiAIQuantumAuth as Auth

# Load variables from backend/.env
load_dotenv()

# Read the API key from the .env file
api_key = os.getenv("QPIAI_QCLOUD_API_KEY")

if not api_key:
    print("ERROR: QPIAI_QCLOUD_API_KEY was not found in backend/.env")
else:
    try:
        Auth.login(api_key)
        result = Auth.verify_api_key()
        print("API key verification result:", result)
    except Exception as e:
        print("Authentication error:", type(e).__name__, str(e))
