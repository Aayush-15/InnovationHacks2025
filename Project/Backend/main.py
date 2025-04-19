from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime
import os
import json
import re

app = FastAPI()

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
REDIRECT_URI = 'http://localhost:8000/oauth2callback'

with open("credentials.json", "r") as f:
    CLIENT_CONFIG = json.load(f)


# 🔐 Helper: Meeting link extractor
def extract_meeting_link(text):
    pattern = r"(https?://(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com)[^\s]+)"
    match = re.search(pattern, text or "")
    return match.group(0) if match else None


# ✅ Load saved credentials if available
def get_saved_credentials():
    if os.path.exists("token.json"):
        return Credentials.from_authorized_user_file("token.json", SCOPES)
    return None


# 🔄 Start OAuth2 flow if needed
def get_flow():
    return Flow.from_client_config(
        client_config=CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )


@app.get("/authorize")
def authorize():
    flow = get_flow()
    auth_url, state = flow.authorization_url(
    access_type='offline',
    include_granted_scopes='true',
    prompt='consent'  # 🔥 Force refresh_token every time
    )
    return RedirectResponse(auth_url)


@app.get("/oauth2callback")
def oauth2callback(request: Request):
    try:
        flow = get_flow()
        flow.fetch_token(authorization_response=str(request.url))

        credentials = flow.credentials
        # ✅ Save to token.json for future use
        with open("token.json", "w") as token_file:
            token_file.write(credentials.to_json())

        return HTMLResponse("""
            <h2>✅ Auth Successful</h2>
            <p><a href='/events'>Go to Events</a></p>
        """)
    except Exception as e:
        return JSONResponse(content={"error": f"OAuth failed: {str(e)}"}, status_code=500)


@app.get("/events")
def get_events():
    try:
        credentials = get_saved_credentials()
        if not credentials or not credentials.valid:
            return JSONResponse(content={"error": "Not authenticated. Visit /authorize first."}, status_code=401)

        service = build('calendar', 'v3', credentials=credentials)
        now = datetime.utcnow().isoformat() + 'Z'

        events_result = service.events().list(
            calendarId='primary',
            timeMin=now,
            maxResults=10,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        events = events_result.get('items', [])
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

        return JSONResponse(content=output)
    except Exception as e:
        print("❌ Error in /events:", e)
        return JSONResponse(content={"error": str(e)}, status_code=500)
