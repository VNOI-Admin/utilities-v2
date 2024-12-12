import os
import time
import requests
import subprocess
import threading

# Configuration from environment variables, with fallback defaults
HEARTBEAT_INTERVAL = int(os.getenv("HEARTBEAT_INTERVAL", 10))  # seconds
QUEUE_CHECK_INTERVAL = int(os.getenv("QUEUE_CHECK_INTERVAL", 10))  # seconds
PRINTING_URL = os.getenv("PRINTING_URL", "https://vpn.vnoi.info/printing/printing")
CLIENT_ID = os.getenv("CLIENT_ID", "print-client")
AUTH_KEY = os.getenv("AUTH_KEY", "secret")
PRINT_FILES_FOLDER = os.getenv("PRINT_FILES_FOLDER", "print_files")
PRINTER = os.getenv("PRINTER", None)
REQUEST_TIMEOUT = os.getenv("REQUEST_TIMEOUT", 10)

HEARTBEAT_ENDPOINT = f"{PRINTING_URL}/clients/{CLIENT_ID}/heartbeat"
QUEUE_ENDPOINT = f"{PRINTING_URL}/clients/{CLIENT_ID}/queue"

# Create folder files if it does not exist
os.makedirs(PRINT_FILES_FOLDER, exist_ok=True)

def heartbeat():
    while True:
        try:
            response = requests.post(HEARTBEAT_ENDPOINT, params={"authKey": AUTH_KEY}, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Failed to send heartbeat: {e}")
        time.sleep(HEARTBEAT_INTERVAL)

def get_print_queue():
    try:
        response = requests.get(QUEUE_ENDPOINT, params={"authKey": AUTH_KEY}, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        queue = response.json()
        return queue
    except requests.RequestException as e:
        print(f"Failed to get print queue: {e}")
        return []

def get_print_file(job_id, filename):
    try:
        print(f"Processing job {job_id}")
        url = f"{PRINTING_URL}/clients/{CLIENT_ID}/jobs/{job_id}/file"
        response = requests.get(url, params={"authKey": AUTH_KEY}, stream=True)
        response.raise_for_status()

        filepath = os.path.join(PRINT_FILES_FOLDER, filename)
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
        process = subprocess.run(
            ["lpr", f"-P", PRINTER, "-o", "media=A4", "-o", "prettyprint", "-o", "fit-to-page", filepath],
            check=True,
            capture_output=True
        )
        print(f"Printed {filepath}")
        return True
    except Exception as e:
        print(f"Failed to print {filepath}: {e}")
        return False

def process_print_queue():
    while True:
        queue = get_print_queue()

        if queue:
            job = queue[0]
            job_id = job["jobId"]
            filename = job["filename"]

            filepath = get_print_file(job_id, filename)
            if not filepath:
                print(f"Skipping job {job_id} due to download failure.")
                continue

            if not print_job(filepath):
                continue

            update_print_status(job_id, "done")

        time.sleep(QUEUE_CHECK_INTERVAL)

def check_printer_exists():
    # run lpstat -a | awk '{print $1}' to get list of printers and check if PRINTER is in the list
    # if PRINTER is not specified, use the default printer
    global PRINTER

    try:
        process = subprocess.Popen(["lpstat", "-a"], stdout=subprocess.PIPE)
        output = process.communicate()[0].decode("utf-8")
        printers = output.split("\n")
        printers = [p.split()[0] for p in printers if p]
        print("Checking printer in list:", printers)
        if PRINTER is None:
            print("No printer specified. Using default printer.")
            PRINTER = printers[0]
        elif PRINTER not in printers:
            print(f"Printer {PRINTER} not found. Using default printer {printers[0]} instead.")
            PRINTER = printers[0]
    except Exception as e:
        print(f"Failed to check printer: {e}")
        PRINTER = None

def main():
    heartbeat_thread = threading.Thread(target=heartbeat, daemon=True)
    heartbeat_thread.start()

    # Run the print queue processing in the main thread
    check_printer_exists()
    process_print_queue()

if __name__ == "__main__":
    main()
