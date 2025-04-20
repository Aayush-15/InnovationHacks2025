import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from http import HTTPStatus
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from email.mime.text import MIMEText
import base64

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# SCOPES = ['https://www.googleapis.com/auth/calendar.readonly',
#         'https://www.googleapis.com/auth/calendar.events']

CALENDAR_READ_SCOPE = ['https://www.googleapis.com/auth/calendar.readonly', "https://www.googleapis.com/auth/calendar.events"]

GMAIL_READ_SCOPE = ['https://www.googleapis.com/auth/gmail.readonly',
                    "https://www.googleapis.com/auth/gmail.send"]

# ---------------- Helper: Parameter Parsing ----------------
def parse_parameters(param_list):
    return {param['name']: param['value'] for param in param_list}


# ---------------- Gmail Support ----------------
def build_gmail_query(from_last_x_days=None, show_only_unread=False, subject_contains=None, sender_email=None):
    query_parts = []
    if from_last_x_days is not None:
        from_last_x_days = min(int(from_last_x_days), 7)
        query_parts.append(f"newer_than:{from_last_x_days}d")
    if str(show_only_unread).lower() == 'true':
        query_parts.append("is:unread")
    if subject_contains:
        query_parts.append(f"subject:{subject_contains}")
    if sender_email:
        query_parts.append(f"from:{sender_email}")
    return ' '.join(query_parts)


def authenticate_gmail():
    if os.path.exists('gmail_token.json'):
        creds = Credentials.from_authorized_user_file('gmail_token.json', GMAIL_READ_SCOPE)
    else:
        flow = InstalledAppFlow.from_client_secrets_file('credentials.json', GMAIL_READ_SCOPE)
        creds = flow.run_local_server(port=8080)
        with open('gmail_token.json', 'w') as token:
            token.write(creds.to_json())
    return creds


def read_gmail(query):
    creds = authenticate_gmail()
    service = build('gmail', 'v1', credentials=creds)
    emails = []
    next_page_token = None

    while True:
        results = service.users().messages().list(userId='me', q=query, pageToken=next_page_token).execute()
        messages = results.get('messages', [])

        for msg in messages:
            msg_data = service.users().messages().get(userId='me', id=msg['id']).execute()
            headers = msg_data['payload']['headers']
            subject = [h['value'] for h in headers if h['name'] == 'Subject']
            snippet = msg_data.get('snippet')
            emails.append(f"Subject: {subject[0] if subject else 'No Subject'}\nSnippet: {snippet}")

        next_page_token = results.get('nextPageToken')
        if not next_page_token:
            break

    return emails or ["No emails found matching the criteria."]

#========== Gmail Send =========
def send_gmail(to_email: str, subject: str, body: str) -> dict:
    """
    Sends an email via Gmail API.

    Parameters:
    - to_email: Email address of the primary recipient (required)
    - subject: The subject line of the email (required)
    - body: The plain text content of the email (required)

    Returns:
    - Dictionary with status and message ID if successful
    """
    try:
        creds = authenticate_gmail()
        service = build('gmail', 'v1', credentials=creds)

        message = MIMEText(body)
        message['to'] = to_email
        message['subject'] = subject

        raw_message = base64.urlsafe_b64encode(message.as_bytes())

        send_result = service.users().messages().send(
            userId='me',
            body={'raw': raw_message.decode()}
        ).execute()

        return {
            'status': 'success',
            'message_id': send_result['id'],
            'recipient': to_email
        }

    except Exception as e:
        return {
            'status': 'error',
            'error': str(e)
        }


# ---------------- Calendar Support ----------------
def authenticate_calendar():
    if os.path.exists('calendar_token.json'):
        creds = Credentials.from_authorized_user_file('calendar_token.json', CALENDAR_READ_SCOPE)
    else:
        flow = InstalledAppFlow.from_client_secrets_file('credentials.json', CALENDAR_READ_SCOPE)
        creds = flow.run_local_server(port=8080)
        with open('calendar_token.json', 'w') as token:
            token.write(creds.to_json())
    return creds


def build_calendar_filter(next_x_days=None, specific_date=None, specific_day=None, specific_time=None, title_keyword=None):
    tz = timezone.utc
    now = datetime.now(tz)
    time_min = now
    time_max = None
    time_range = None

    if next_x_days:
        next_x_days = min(int(next_x_days), 7)
        time_max = now + timedelta(days=next_x_days)
    elif specific_date:
        date = datetime.strptime(specific_date, "%Y-%m-%d").replace(tzinfo=tz)
        time_min = date
        time_max = date + timedelta(days=1)
    elif specific_day:
        weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        target = weekdays.index(specific_day.lower())
        delta = (target - now.weekday() + 7) % 7
        target_date = now + timedelta(days=delta)
        time_min = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        time_max = time_min + timedelta(days=1)

    if specific_time:
        if '-' in specific_time:
            sh, eh = specific_time.split('-')
            start_hour, start_min = map(int, sh.strip().split(':'))
            end_hour, end_min = map(int, eh.strip().split(':'))
        else:
            start_hour, start_min = map(int, specific_time.strip().split(':'))
            end_hour, end_min = start_hour + 1, start_min
        time_range = ((start_hour, start_min), (end_hour, end_min))

    return {
        "timeMin": time_min.isoformat(),
        "timeMax": time_max.isoformat() if time_max else None,
        "titleKeyword": title_keyword.lower() if title_keyword else None,
        "approxTimeRange": time_range
    }


def read_calendar(filters):
    print(1)
    creds = authenticate_calendar()
    print(2)
    service = build('calendar', 'v3', credentials=creds)
    print(3)
    time_min = filters['timeMin']
    time_max = filters['timeMax']

    results = service.events().list(
        calendarId='primary',
        timeMin=time_min,
        timeMax=time_max,
        singleEvents=True,
        orderBy='startTime'
    ).execute()
    print(4)

    events = results.get('items', [])
    summaries = []

    for event in events:
        summary = event.get('summary', 'No Title')
        start = event['start'].get('dateTime', event['start'].get('date'))
        end = event['end'].get('dateTime', event['end'].get('date'))
        description = event.get('description', '')
        location = event.get('location', '')
        link = event.get('hangoutLink', '')
        organizer = event.get('organizer', {}).get('email', '')

        if filters["titleKeyword"] and filters["titleKeyword"] not in summary.lower():
            continue

        if filters["approxTimeRange"] and 'dateTime' in event['start']:
            event_dt = datetime.fromisoformat(event['start']['dateTime'])
            hour, minute = event_dt.hour, event_dt.minute
            (sh, sm), (eh, em) = filters["approxTimeRange"]
            if not (sh <= hour < eh or (sh == hour and sm <= minute)):
                continue

        summaries.append(f"Summary: {summary}\nStart: {start}\nEnd: {end}\nOrganizer: {organizer}\nLink: {link or location or 'N/A'}")

    return summaries or ["No calendar events found matching the criteria."]
    
# ---------------- Add Calendar ----------------
def build_event_body(summary, start_time_str, end_time_str=None, guests=None, add_meet_link=True):
    # Convert UTC-7 to UTC (manual offset)
    start_dt = datetime.fromisoformat(start_time_str) + timedelta(hours=7)
    start_dt = start_dt.replace(tzinfo=timezone.utc)

    if end_time_str:
        end_dt = datetime.fromisoformat(end_time_str) + timedelta(hours=7)
        end_dt = end_dt.replace(tzinfo=timezone.utc)
    else:
        end_dt = start_dt + timedelta(hours=1)

    event = {
        "summary": summary,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": "UTC"},
        "attendees": [{"email": email} for email in guests or []],
    }

    if add_meet_link:
        event["conferenceData"] = {
            "createRequest": {
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
                "requestId": f"meet-{int(datetime.now().timestamp())}"
            }
        }

    return event


def create_calendar_event(event_body):
    try:
        creds = authenticate_calendar()
        service = build('calendar', 'v3', credentials=creds)

        event = service.events().insert(
            calendarId='primary',
            body=event_body,
            conferenceDataVersion=1,
            sendUpdates='all'
        ).execute()

        return f"Event created: {event.get('htmlLink')}"
    except Exception as e:
        return f"Error creating event: {e}"


# ---------------- Main Lambda Handler ----------------
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        action_group = event['actionGroup']
        function = event['function']
        message_version = event.get('messageVersion', 1)
        raw_parameters = event.get('parameters', [])

        params = parse_parameters(raw_parameters)

        if function == 'read_gmail':
            query = build_gmail_query(
                from_last_x_days=params.get('from_last_x_days'),
                show_only_unread=params.get('show_only_unread', 'true'),
                subject_contains=params.get('subject_contains'),
                sender_email=params.get('sender_email')
            )
            output = read_gmail(query)

        elif function == 'read_calendar':
            filters = build_calendar_filter(
                next_x_days=params.get('next_x_days'),
                specific_date=params.get('specific_date'),
                specific_day=params.get('specific_day'),
                specific_time=params.get('specific_time'),
                title_keyword=params.get('title_keyword')
            )
            # print(filters)
            output = read_calendar(filters)
        
        elif function == 'create_calendar_event':
            guests = params.get('guests')
            # Ensure it's a Python list if it's passed as a string
            if isinstance(guests, str):
                try:
                    import json
                    guests = json.loads(guests)
                except Exception:
                    guests = [guests]

            event_data = build_event_body(
                summary=params.get('summary'),
                start_time_str=params.get('start_time_str'),
                end_time_str=params.get('end_time_str'),
                guests=guests,
                add_meet_link=str(params.get('add_meet_link', 'true')).lower() == 'true'
            )
            output = [create_calendar_event(event_data)]
        
        elif function == 'send_gmail':
            result = send_gmail(
                to_email=params.get('to_email'),
                subject=params.get('subject'),
                body=params.get('body')
            )

            output = [f"Email sent to {result['recipient']}. Message ID: {result['message_id']}"] if result['status'] == 'success' else [f"Failed to send email: {result['error']}"]


        else:
            output = [f"No handler for function: {function}"]

        response_body = {
            'TEXT': {
                'body': "\n\n".join(output)
            }
        }

        return {
            'response': {
                'actionGroup': action_group,
                'function': function,
                'functionResponse': {
                    'responseBody': response_body
                }
            },
            'messageVersion': message_version
        }

    except Exception as e:
        logger.error("Error in Lambda: %s", str(e))
        return {
            'statusCode': HTTPStatus.INTERNAL_SERVER_ERROR,
            'body': f"Error: {str(e)}"
        }
