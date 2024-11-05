import os
import time
import requests
import subprocess
import threading

# Configuration from environment variables, with fallback defaults
HEARTBEAT_INTERVAL = int(os.getenv("HEARTBEAT_INTERVAL", 30))  # seconds
QUEUE_CHECK_INTERVAL = int(os.getenv("QUEUE_CHECK_INTERVAL", 10))  # seconds
PRINTING_URL = os.getenv("PRINTING_URL", "https://vpn.vnoi.info/printing")
CLIENT_ID = os.getenv("CLIENT_ID", "print-client")
AUTH_KEY = os.getenv("AUTH_KEY", "secret")
PRINT_FILES_FOLDER = os.getenv("PRINT_FILES_FOLDER", "files")

HEARTBEAT_ENDPOINT = f"{PRINTING_URL}/clients/{CLIENT_ID}/heartbeat"
QUEUE_ENDPOINT = f"{PRINTING_URL}/clients/{CLIENT_ID}/queue"


def heartbeat():
    while True:
        try:
            response = requests.post(HEARTBEAT_ENDPOINT, params={"authKey": AUTH_KEY})
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Failed to send heartbeat: {e}")
        time.sleep(HEARTBEAT_INTERVAL)

def get_print_queue():
    try:
        response = requests.get(QUEUE_ENDPOINT, params={"authKey": AUTH_KEY})
        response.raise_for_status()
        queue = response.json()
        return queue
    except requests.RequestException as e:
        print(f"Failed to get print queue: {e}")
        return []

def get_print_file(job_id, filename):
    try:
        url = f"{PRINTING_URL}/clients/{CLIENT_ID}/jobs/{job_id}/file"
        response = requests.get(url, stream=True)
        response.raise_for_status()

        filepath = os.path.join(PRINT_FILES_FOLDER, job_id + "_" + filename)
        with open(filepath, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        return filepath
    except requests.RequestException as e:
        print(f"Failed to download file for job {job_id}: {e}")
        return None

def update_print_status(job_id, status):
    try:
        url = f"{PRINTING_URL}/clients/{CLIENT_ID}/jobs/{job_id}/status"
        response = requests.patch(url, params={"authKey": AUTH_KEY}, json={"status": status})
        response.raise_for_status()
        return True
    except requests.RequestException as e:
        print(f"Failed to update print status for job {job_id}: {e}")
        return False

def print_job(filepath):
    try:
        process = subprocess.Popen(f'lpr -o media=A4 -o prettyprint -o fit-to-page {filepath}', shell=True)
        process.wait()
        return True
    except Exception as e:
        print(f"Failed to print {filepath}: {e}")
        return False

def process_print_queue():
    while True:
        queue = get_print_queue()

        if queue:
            job = queue[0]
            job_id = job["id"]
            filename = job["filename"]

            filepath = get_print_file(job_id, filename)
            if not filepath:
                print(f"Skipping job {job_id} due to download failure.")
                continue

            if not update_print_status(job_id, "printing"):
                # Failed to update status; skip this job
                continue

            if not print_job(filepath):
                # Failed to print; skip this job
                continue

            update_print_status(job_id, "done")

        time.sleep(QUEUE_CHECK_INTERVAL)

def main():
    heartbeat_thread = threading.Thread(target=heartbeat, daemon=True)
    heartbeat_thread.start()

    # Run the print queue processing in the main thread
    process_print_queue()

if __name__ == "__main__":
    main()
