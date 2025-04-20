import os
import base64
from typing import Optional
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse, RedirectResponse, HTMLResponse
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

app = FastAPI()

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'


# ------------------ Helper: Authenticate Gmail ------------------

def authenticate_gmail():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    else:
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
        creds = flow.run_local_server(port=8080)
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
    return creds


# ------------------ API: Root ------------------

@app.get("/")
def home():
    return HTMLResponse(content="""
    <h2>📧 Gmail Reader API</h2>
    <ul>
        <li><a href='/authorize'>Step 1: Authorize Gmail</a></li>
        <li><a href='/emails'>Step 2: View Unread Emails</a></li>
    </ul>
    """)


# ------------------ API: Authorize ------------------

@app.get("/authorize")
def authorize():
    if os.path.exists(TOKEN_FILE):
        return HTMLResponse(content="<h3>✅ Already Authorized! Visit <a href='/emails'>/emails</a></h3>")
    # Run initial login flow in a browser
    authenticate_gmail()
    return HTMLResponse(content="<h3>✅ Authorization Complete! Now go to <a href='/emails'>/emails</a></h3>")


# ------------------ API: Read Emails ------------------

@app.get("/emails")
def read_gmail(filters: Optional[str] = Query(default="newer_than:2d is:read")):
    try:
        creds = authenticate_gmail()
        service = build('gmail', 'v1', credentials=creds)

        query = filters
        results = service.users().messages().list(userId='me', q=query).execute()
        messages = results.get('messages', [])

        output = []
        for msg in messages:
            msg_data = service.users().messages().get(userId='me', id=msg['id']).execute()
            headers = msg_data['payload']['headers']
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
            snippet = msg_data.get('snippet', '')
            output.append({
                "subject": subject,
                "snippet": snippet
            })

        return JSONResponse(content={"emails": output})

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
