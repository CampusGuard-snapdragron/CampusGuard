#!/usr/bin/env python3
"""
Upload CampusGuard AAB to Google Play Console Internal Testing Track.

Prerequisites:
  1. Create a Google Cloud Service Account:
     - Go to https://console.cloud.google.com
     - APIs & Services > Credentials > Create Service Account
     - Grant it the role "Service Account User"
     - Download the JSON key file
  
  2. Enable the Google Play Developer API:
     - In Google Cloud Console: APIs & Services > Enable APIs > 
       search "Google Play Android Developer API" > Enable

  3. Link the service account to Play Console:
     - Go to https://play.google.com/console
     - Settings > API access > Link your Google Cloud project
     - Grant the service account "Release Manager" permission

  4. Run: python3 upload_to_play.py /path/to/service-account-key.json

Note: The app must be created manually in Play Console FIRST.
"""

import sys
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

PACKAGE_NAME = "com.haas.campusguard"
AAB_PATH = os.path.join(os.path.dirname(__file__), "app/build/outputs/bundle/release/app-release.aab")
TRACK = "internal"  # internal testing track

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 upload_to_play.py <service-account-key.json>")
        print("\nSee the top of this script for setup instructions.")
        sys.exit(1)

    key_file = sys.argv[1]
    
    if not os.path.exists(key_file):
        print(f"Error: Service account key file not found: {key_file}")
        sys.exit(1)
    
    if not os.path.exists(AAB_PATH):
        print(f"Error: AAB file not found: {AAB_PATH}")
        print("Run: ./gradlew :app:bundleRelease")
        sys.exit(1)

    print(f"AAB file: {AAB_PATH} ({os.path.getsize(AAB_PATH) / 1024 / 1024:.1f} MB)")
    print(f"Package: {PACKAGE_NAME}")
    print(f"Track: {TRACK}")
    print()

    # Authenticate
    credentials = service_account.Credentials.from_service_account_file(
        key_file,
        scopes=["https://www.googleapis.com/auth/androidpublisher"]
    )
    service = build("androidpublisher", "v3", credentials=credentials)

    # Create edit
    print("Creating edit...")
    edit = service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()
    edit_id = edit["id"]
    print(f"Edit ID: {edit_id}")

    # Upload AAB
    print("Uploading AAB (this may take a minute)...")
    media = MediaFileUpload(AAB_PATH, mimetype="application/octet-stream", resumable=True)
    bundle = service.edits().bundles().upload(
        packageName=PACKAGE_NAME,
        editId=edit_id,
        media_body=media
    ).execute()
    version_code = bundle["versionCode"]
    print(f"Uploaded! Version code: {version_code}")

    # Assign to internal track
    print(f"Assigning to '{TRACK}' track...")
    service.edits().tracks().update(
        packageName=PACKAGE_NAME,
        editId=edit_id,
        track=TRACK,
        body={
            "track": TRACK,
            "releases": [{
                "versionCodes": [str(version_code)],
                "status": "completed"
            }]
        }
    ).execute()

    # Commit
    print("Committing edit...")
    service.edits().commit(packageName=PACKAGE_NAME, editId=edit_id).execute()
    
    print()
    print("=" * 50)
    print("SUCCESS! AAB uploaded to internal testing track.")
    print(f"Check: https://play.google.com/console")
    print("=" * 50)

if __name__ == "__main__":
    main()
