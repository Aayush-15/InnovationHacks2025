import os
import json
import re
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

app = FastAPI()

# Configuration
CREDENTIALS_FILE = "credentials.json"
GMAIL_TOKEN_FILE = "gmail_token.json"
CALENDAR_TOKEN_FILE = "calendar_token.json"

GMAIL_SCOPE = ["https://www.googleapis.com/auth/gmail.readonly"]
CALENDAR_SCOPE = ["https://www.googleapis.com/auth/calendar.readonly"]
COMBINED_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly"
]

# Update your port assignments
GMAIL_PORT = 8080  # For Gmail auth
CALENDAR_PORT = 8082  # Changed from 8081 to avoid conflicts

# ------------------ Helper Functions ------------------

def extract_meeting_link(text: str) -> Optional[str]:
    """Extract meeting links from text."""
    if not text:
        return None
    pattern = r"(https?://(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com)[^\s]+)"
    match = re.search(pattern, text)
    return match.group(0) if match else None

def check_credentials_file():
    """Check if credentials file exists and is valid."""
    if not os.path.exists(CREDENTIALS_FILE):
        raise HTTPException(
            status_code=500,
            detail=f"Credentials file '{CREDENTIALS_FILE}' not found. Please ensure it exists."
        )
    try:
        with open(CREDENTIALS_FILE) as f:
            json.load(f)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid JSON in '{CREDENTIALS_FILE}'. Please check the file format."
        )

# ------------------ Authentication Functions ------------------
def authenticate_gmail():
    """Authenticate with Gmail API with proper refresh token handling"""
    try:
        # Check for existing valid token
        if os.path.exists(GMAIL_TOKEN_FILE):
            creds = Credentials.from_authorized_user_file(GMAIL_TOKEN_FILE, GMAIL_SCOPE)
            if creds and creds.valid:
                return creds
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                with open(GMAIL_TOKEN_FILE, "w") as token:
                    token.write(creds.to_json())
                return creds
            os.unlink(GMAIL_TOKEN_FILE)  # Remove invalid token

        # Load client configuration
        with open(CREDENTIALS_FILE) as f:
            client_config = json.load(f)

        # Ensure we request offline access for refresh token
        flow = InstalledAppFlow.from_client_config(
            client_config,
            scopes=GMAIL_SCOPE,
            redirect_uri="http://localhost:8080"  # Must match credentials.json
        )

        # Force consent prompt to ensure refresh token
        creds = flow.run_local_server(
            port=8080,
            prompt="consent",
            authorization_prompt_message="Please visit this URL: {url}",
            success_message="Authentication complete! You may close this window.",
            open_browser=True
        )

        # Verify we got a refresh token
        if not creds.refresh_token:
            raise ValueError("No refresh token received - ensure you grant offline access")

        # Save credentials
        with open(GMAIL_TOKEN_FILE, "w") as token:
            token.write(creds.to_json())

        return creds

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gmail authentication failed: {str(e)}"
        )

def authenticate_calendar():
    """Authenticate with Calendar API with port conflict handling"""
    try:
        if os.path.exists(CALENDAR_TOKEN_FILE):
            creds = Credentials.from_authorized_user_file(CALENDAR_TOKEN_FILE, CALENDAR_SCOPE)
            if creds and creds.valid:
                return creds
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                with open(CALENDAR_TOKEN_FILE, "w") as token:
                    token.write(creds.to_json())
                return creds
            os.unlink(CALENDAR_TOKEN_FILE)

        with open(CREDENTIALS_FILE) as f:
            client_config = json.load(f)

        flow = InstalledAppFlow.from_client_config(
            client_config,
            scopes=CALENDAR_SCOPE,
            redirect_uri="http://localhost:8082"  # Updated port
        )

        # Try multiple ports if needed
        for port in [8082, 8083, 8084]:  # Fallback ports
            try:
                creds = flow.run_local_server(
                    port=port,
                    prompt="consent",
                    authorization_prompt_message="Please visit this URL: {url}",
                    success_message="Authentication complete! You may close this window.",
                    open_browser=True
                )
                break
            except OSError as e:
                if "Address already in use" in str(e) and port != 8084:
                    continue
                raise

        if not creds.refresh_token:
            raise ValueError("No refresh token received")

        with open(CALENDAR_TOKEN_FILE, "w") as token:
            token.write(creds.to_json())

        return creds

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Calendar authentication failed: {str(e)}"
        )

def authenticate_combined():
    """Authenticate both Gmail and Calendar in one flow"""
    try:
        # Check if we already have valid tokens
        gmail_creds = calendar_creds = None
        if os.path.exists(GMAIL_TOKEN_FILE):
            gmail_creds = Credentials.from_authorized_user_file(GMAIL_TOKEN_FILE, COMBINED_SCOPES)
        if os.path.exists(CALENDAR_TOKEN_FILE):
            calendar_creds = Credentials.from_authorized_user_file(CALENDAR_TOKEN_FILE, COMBINED_SCOPES)
        
        # If both tokens are valid, return them
        if (gmail_creds and gmail_creds.valid and 
            calendar_creds and calendar_creds.valid):
            return gmail_creds, calendar_creds

        # Otherwise start new auth flow
        with open(CREDENTIALS_FILE) as f:
            client_config = json.load(f)

        flow = InstalledAppFlow.from_client_config(
            client_config,
            scopes=COMBINED_SCOPES,
            redirect_uri="http://localhost:8080"  # Must match credentials.json
        )

        creds = flow.run_local_server(
            port=8080,
            prompt="consent",
            open_browser=True
        )

        # Save the same credentials for both services
        with open(GMAIL_TOKEN_FILE, "w") as token:
            token.write(creds.to_json())
        with open(CALENDAR_TOKEN_FILE, "w") as token:
            token.write(creds.to_json())

        return creds, creds

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Combined authentication failed: {str(e)}"
        )
# ------------------ Routes ------------------

@app.get("/", response_class=RedirectResponse)
async def root():
    """Redirect to home page."""
    return "/home"

@app.get("/home")
async def home():
    """Home page with navigation links."""
    try:
        # Check if credentials file exists (but don't require it for home page)
        if os.path.exists(CREDENTIALS_FILE):
            with open(CREDENTIALS_FILE) as f:
                json.load(f)  # Validate JSON
                
        gmail_authed = os.path.exists(GMAIL_TOKEN_FILE)
        calendar_authed = os.path.exists(CALENDAR_TOKEN_FILE)
        
        auth_status = []
        if gmail_authed:
            auth_status.append("✅ Gmail Authorized")
        if calendar_authed:
            auth_status.append("✅ Calendar Authorized")
            
        auth_message = "<br>".join(auth_status) if auth_status else "❌ Not Authorized"
            
        return HTMLResponse(f"""
        <h2>📬 Gmail & 📅 Calendar Dashboard</h2>
        <p>Authorization Status: {auth_message}</p>
        <ul>
            <li><a href="/authorize">Step 1: Authorize Gmail & Calendar</a></li>
            <li><a href="/email">Step 2: Read Gmail (Unread Emails)</a></li>
            <li><a href="/calendar">Step 3: View Upcoming Calendar Events</a></li>
        </ul>
        """)
    except Exception as e:
        return HTMLResponse(f"""
        <h2>📬 Gmail & 📅 Calendar Dashboard</h2>
        <p style="color: red;">Warning: {str(e)}</p>
        <ul>
            <li><a href="/authorize">Step 1: Authorize Gmail & Calendar</a></li>
        </ul>
        """)



# ------------------ 🌐 /authorize ------------------

@app.get("/authorize")
def authorize_both():
    try:
        gmail_creds, calendar_creds = authenticate_combined()
        return HTMLResponse("""
        <h3>✅ Authorization Complete</h3>
        <p>Both Gmail and Calendar are now authorized.</p>
        <a href="/email">Access Gmail</a> | 
        <a href="/calendar">Access Calendar</a>
        """)
    except Exception as e:
        return HTMLResponse(f"""
        <h3>❌ Authorization Failed</h3>
        <p style="color:red">{str(e)}</p>
        <a href="/authorize">Try Again</a>
        """)



# ------------------ 🌐 /email ------------------

@app.get("/email")
def read_gmail(filters: Optional[str] = Query(default="newer_than:2d is:unread")):
    try:
        creds = authenticate_gmail()
        service = build('gmail', 'v1', credentials=creds)

        results = service.users().messages().list(userId='me', q=filters).execute()
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


# ------------------ 🌐 /calendar ------------------

@app.get("/calendar")
def get_calendar_events():
    try:
        creds = authenticate_calendar()
        service = build('calendar', 'v3', credentials=creds)

        now = datetime.utcnow().isoformat() + 'Z'
        results = service.events().list(
            calendarId='primary',
            timeMin=now,
            maxResults=10,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        events = results.get('items', [])
        output = []

        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            summary = event.get('summary', 'No Title')
            description = event.get('description', '')
            location = event.get('location', '')
            hangout = event.get('hangoutLink', '')
            organizer = event.get('organizer', {}).get('email', '')

            meeting_link = hangout or extract_meeting_link(description) or location

            output.append({
                "summary": summary,
                "start_time": start,
                "meeting_link": meeting_link,
                "organizer": organizer
            })

        return JSONResponse(content={"events": output})

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


#uvicorn calandgmail:app --reload