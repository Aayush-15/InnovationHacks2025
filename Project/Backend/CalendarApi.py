import os
import json
import re
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

app = FastAPI()

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'


# 🔐 Extract meeting links (Google Meet, Zoom, Teams)
def extract_meeting_link(text):
    pattern = r"(https?://(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com)[^\s]+)"
    match = re.search(pattern, text or "")
    return match.group(0) if match else None


# 🔄 Authenticate (loads from token.json or starts OAuth)
def authenticate_calendar():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    else:
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
        creds = flow.run_local_server(port=8081, prompt='consent')
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
    return creds


# ------------------ API: Home ------------------

@app.get("/")
def home():
    return HTMLResponse(content="""
    <h2>📅 Google Calendar API</h2>
    <ul>
        <li><a href='/authorize'>Step 1: Authorize Calendar</a></li>
        <li><a href='/events'>Step 2: Fetch Events</a></li>
    </ul>
    """)


# ------------------ API: Authorize ------------------

@app.get("/authorize")
def authorize():
    if os.path.exists(TOKEN_FILE):
        return HTMLResponse(content="<h3>✅ Already Authorized! Go to <a href='/events'>/events</a></h3>")
    authenticate_calendar()
    return HTMLResponse(content="<h3>✅ Calendar Authorized! Now go to <a href='/events'>/events</a></h3>")


# ------------------ API: Get Calendar Events ------------------

@app.get("/events")
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
