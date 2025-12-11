#!/usr/bin/env python3
"""
SSH Helper Script for managing users across multiple IPs.
Supports SSH commands and SCP file transfers with parallel execution.
"""

import argparse
import json
import queue
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Optional

SCRIPTS_DIR = Path(__file__).parent
SCRIPTS_FILE = SCRIPTS_DIR / "ssh_scripts.json"

SSH_OPTIONS = [
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "LogLevel=ERROR",
]


class ScriptType(str, Enum):
    SSH = "ssh"
    SCP = "scp"


class ResultStatus(str, Enum):
    SUCCESS = "success"
    TIMEOUT = "timeout"
    FAILED = "failed"


@dataclass
class ExecutionResult:
    ip: str
    status: ResultStatus
    return_code: Optional[int] = None
    error_message: Optional[str] = None


def load_scripts() -> dict:
    """Load scripts from JSON file."""
    if not SCRIPTS_FILE.exists():
        return {}
    with open(SCRIPTS_FILE, "r") as f:
        return json.load(f)


def save_scripts(scripts: dict) -> None:
    """Save scripts to JSON file."""
    with open(SCRIPTS_FILE, "w") as f:
        json.dump(scripts, f, indent=2)


def ip_to_int(ip: str) -> int:
    """Convert IP address to integer."""
    parts = ip.split(".")
    return (int(parts[0]) << 24) + (int(parts[1]) << 16) + (int(parts[2]) << 8) + int(parts[3])


def int_to_ip(num: int) -> str:
    """Convert integer to IP address."""
    return f"{(num >> 24) & 0xFF}.{(num >> 16) & 0xFF}.{(num >> 8) & 0xFF}.{num & 0xFF}"


def generate_ip_range(start_ip: str, count: int) -> list[str]:
    """Generate a list of IPs starting from start_ip."""
    start = ip_to_int(start_ip)
    return [int_to_ip(start + i) for i in range(count)]


def substitute_inputs(command: str, inputs: Optional[list[str]] = None) -> str:
    """Replace $1, $2, etc. placeholders with input values."""
    if not inputs:
        return command
    result = command
    for i, value in enumerate(inputs, start=1):
        result = result.replace(f"${i}", value)
    return result


def build_ssh_command(ip: str, command: str, key_path: Optional[str] = None, inputs: Optional[list[str]] = None) -> list[str]:
    """Build SSH command list."""
    key_opts = ["-i", key_path] if key_path else []
    final_command = substitute_inputs(command, inputs)
    return ["ssh", *SSH_OPTIONS, *key_opts, f"root@{ip}", final_command]


def build_scp_command(ip: str, source: str, destination: str, key_path: Optional[str] = None) -> list[str]:
    """Build SCP command list."""
    key_opts = ["-i", key_path] if key_path else []
    remote_dest = f"root@{ip}:{destination}"
    return ["scp", *SSH_OPTIONS, *key_opts, source, remote_dest]


def execute_on_host(ip: str, script: dict, key_path: Optional[str] = None, inputs: Optional[list[str]] = None) -> ExecutionResult:
    """Execute script on a single host."""
    script_type = script["type"]
    timeout = script.get("timeout", 10)

    if script_type == ScriptType.SSH:
        cmd = build_ssh_command(ip, script["command"], key_path, inputs)
    elif script_type == ScriptType.SCP:
        cmd = build_scp_command(ip, script["source"], script["destination"], key_path)
    else:
        return ExecutionResult(ip=ip, status=ResultStatus.FAILED, error_message=f"Unknown script type: {script_type}")

    try:
        result = subprocess.run(
            cmd,
            timeout=timeout,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            return ExecutionResult(ip=ip, status=ResultStatus.SUCCESS, return_code=0)
        else:
            return ExecutionResult(
                ip=ip,
                status=ResultStatus.FAILED,
                return_code=result.returncode,
                error_message=result.stderr.strip() or result.stdout.strip(),
            )
    except subprocess.TimeoutExpired:
        return ExecutionResult(ip=ip, status=ResultStatus.TIMEOUT)
    except Exception as e:
        return ExecutionResult(ip=ip, status=ResultStatus.FAILED, error_message=str(e))


def create_script(args: argparse.Namespace) -> None:
    """Create a new script and save it."""
    scripts = load_scripts()

    if args.name in scripts and not args.force:
        print(f"Script '{args.name}' already exists. Use --force to overwrite.")
        sys.exit(1)

    script_data = {
        "type": args.type,
        "timeout": args.timeout,
    }

    if args.type == ScriptType.SSH:
        if not args.command:
            print("SSH script requires --command argument.")
            sys.exit(1)
        script_data["command"] = args.command
    elif args.type == ScriptType.SCP:
        if not args.source or not args.destination:
            print("SCP script requires --source and --destination arguments.")
            sys.exit(1)
        script_data["source"] = args.source
        script_data["destination"] = args.destination

    scripts[args.name] = script_data
    save_scripts(scripts)
    print(f"Script '{args.name}' created successfully.")
    print(f"  Type: {args.type}")
    print(f"  Timeout: {args.timeout}s")
    if args.type == ScriptType.SSH:
        print(f"  Command: {args.command}")
    else:
        print(f"  Source: {args.source}")
        print(f"  Destination: {args.destination}")


def list_scripts(args: argparse.Namespace) -> None:
    """List all available scripts."""
    scripts = load_scripts()
    if not scripts:
        print("No scripts found.")
        return

    print("Available scripts:")
    print("-" * 60)
    for name, data in scripts.items():
        print(f"\n  {name}:")
        print(f"    Type: {data['type']}")
        print(f"    Timeout: {data.get('timeout', 10)}s")
        if data["type"] == ScriptType.SSH:
            print(f"    Command: {data['command']}")
        else:
            print(f"    Source: {data['source']}")
            print(f"    Destination: {data['destination']}")


def delete_script(args: argparse.Namespace) -> None:
    """Delete a script."""
    scripts = load_scripts()
    if args.name not in scripts:
        print(f"Script '{args.name}' not found.")
        sys.exit(1)

    del scripts[args.name]
    save_scripts(scripts)
    print(f"Script '{args.name}' deleted successfully.")


def result_printer_worker(result_queue: queue.Queue, total_hosts: int, progress_lock: threading.Lock) -> list[ExecutionResult]:
    """Worker thread for printing results as they arrive."""
    results: list[ExecutionResult] = []
    completed = 0

    while completed < total_hosts:
        try:
            result = result_queue.get(timeout=1)
            if result is None:  # Sentinel value to stop
                break

            results.append(result)
            completed += 1

            status_symbol = {
                ResultStatus.SUCCESS: "✓",
                ResultStatus.TIMEOUT: "⏱",
                ResultStatus.FAILED: "✗",
            }[result.status]

            status_color = {
                ResultStatus.SUCCESS: "\033[92m",
                ResultStatus.TIMEOUT: "\033[93m",
                ResultStatus.FAILED: "\033[91m",
            }[result.status]

            reset_color = "\033[0m"

            with progress_lock:
                print(f"  {status_color}{status_symbol}{reset_color} {result.ip}: {result.status.value}", end="")
                if result.return_code is not None and result.return_code != 0:
                    print(f" (exit code: {result.return_code})", end="")
                if result.error_message:
                    print(f" - {result.error_message[:50]}...", end="") if len(result.error_message) > 50 else print(f" - {result.error_message}", end="")
                print(f" [{completed}/{total_hosts}]")

        except queue.Empty:
            continue

    return results


def run_script(args: argparse.Namespace) -> None:
    """Run a script on multiple hosts."""
    scripts = load_scripts()

    if args.name not in scripts:
        print(f"Script '{args.name}' not found.")
        print("Available scripts:", ", ".join(scripts.keys()) if scripts else "none")
        sys.exit(1)

    script = scripts[args.name]
    ips = generate_ip_range(args.start_ip, args.count)
    key_path = args.key
    inputs = args.input or []

    print(f"Running script '{args.name}' on {args.count} hosts...")
    print(f"IP range: {ips[0]} - {ips[-1]}")
    print(f"Timeout: {script.get('timeout', 10)}s")
    print(f"Workers: {args.workers}")
    if key_path:
        print(f"SSH key: {key_path}")
    if inputs:
        print(f"Inputs: {inputs}")
        if script["type"] == ScriptType.SSH:
            print(f"Command: {substitute_inputs(script['command'], inputs)}")
    print("-" * 60)

    # Create queue for results and lock for thread-safe printing
    result_queue: queue.Queue = queue.Queue()
    progress_lock = threading.Lock()
    printer_results_container = []

    def printer_wrapper():
        results = result_printer_worker(result_queue, len(ips), progress_lock)
        printer_results_container.extend(results)

    # Start dedicated result printer thread
    printer_thread = threading.Thread(target=printer_wrapper, daemon=False)
    printer_thread.start()

    max_workers = min(args.workers, len(ips))
    start_time = time.time()

    # Execute tasks and queue results for async processing
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_ip = {executor.submit(execute_on_host, ip, script, key_path, inputs): ip for ip in ips}

        for future in as_completed(future_to_ip):
            result = future.result()
            result_queue.put(result)

    # Wait for printer thread to finish processing all results
    printer_thread.join()

    results = printer_results_container
    elapsed_time = time.time() - start_time

    # Summary
    success = [r for r in results if r.status == ResultStatus.SUCCESS]
    timeout = [r for r in results if r.status == ResultStatus.TIMEOUT]
    failed = [r for r in results if r.status == ResultStatus.FAILED]

    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total hosts: {len(results)}")
    print(f"Elapsed time: {elapsed_time:.2f}s")
    print()
    print(f"\033[92mSuccess: {len(success)}\033[0m")
    print(f"\033[93mTimeout: {len(timeout)}\033[0m")
    print(f"\033[91mFailed:  {len(failed)}\033[0m")

    if timeout:
        print()
        print("Timeout hosts:")
        for r in timeout:
            print(f"  - {r.ip}")

    if failed:
        print()
        print("Failed hosts:")
        for r in failed:
            msg = f" (exit code: {r.return_code})" if r.return_code else ""
            if r.error_message:
                msg += f" - {r.error_message}"
            print(f"  - {r.ip}{msg}")

    # Exit with error code if any failures
    if timeout or failed:
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="SSH Helper for managing users across multiple IPs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create an SSH script
  python ssh_helper.py create my-script --type ssh --command "uptime" --timeout 15

  # Create an SSH script with placeholders for dynamic input
  python ssh_helper.py create send-notify --type ssh --command "send-notify $1 $2"

  # Create an SCP script
  python ssh_helper.py create copy-config --type scp --source ./config.txt --destination /etc/config.txt

  # List all scripts
  python ssh_helper.py list

  # Run a script on 10 hosts starting from 192.168.1.100
  python ssh_helper.py run my-script --start-ip 192.168.1.100 --count 10

  # Run with dynamic inputs (replaces $1, $2 in command)
  python ssh_helper.py run send-notify --start-ip 192.168.1.100 --count 10 --input "Please do this" --input "and that"

  # Run with SSH key
  python ssh_helper.py run my-script --start-ip 192.168.1.100 --count 10 --key ~/.ssh/id_rsa

  # Run with more parallel workers
  python ssh_helper.py run my-script --start-ip 192.168.1.100 --count 50 --workers 20

  # Delete a script
  python ssh_helper.py delete my-script
        """,
    )

    subparsers = parser.add_subparsers(dest="action", required=True)

    # Create subcommand
    create_parser = subparsers.add_parser("create", help="Create a new script")
    create_parser.add_argument("name", help="Script name")
    create_parser.add_argument("--type", "-t", choices=[ScriptType.SSH, ScriptType.SCP], required=True, help="Script type")
    create_parser.add_argument("--command", "-c", help="SSH command to execute")
    create_parser.add_argument("--source", "-s", help="SCP source file path")
    create_parser.add_argument("--destination", "-d", help="SCP destination path on remote host")
    create_parser.add_argument("--timeout", type=int, default=10, help="Timeout in seconds (default: 10)")
    create_parser.add_argument("--force", "-f", action="store_true", help="Overwrite existing script")
    create_parser.set_defaults(func=create_script)

    # List subcommand
    list_parser = subparsers.add_parser("list", help="List all scripts")
    list_parser.set_defaults(func=list_scripts)

    # Delete subcommand
    delete_parser = subparsers.add_parser("delete", help="Delete a script")
    delete_parser.add_argument("name", help="Script name to delete")
    delete_parser.set_defaults(func=delete_script)

    # Run subcommand
    run_parser = subparsers.add_parser("run", help="Run a script on multiple hosts")
    run_parser.add_argument("name", help="Script name to run")
    run_parser.add_argument("--start-ip", "-i", required=True, help="Starting IP address")
    run_parser.add_argument("--count", "-n", type=int, help="Number of hosts", default=1)
    # default key to ~/.ssh/id_icpc
    run_parser.add_argument("--key", "-k", help="Path to SSH private key", default=str(Path.home() / ".ssh" / "id_icpc"))
    run_parser.add_argument("--input", action="append", help="Input values to replace $1, $2, etc. in command (can be used multiple times)")
    run_parser.add_argument("--workers", "-w", type=int, default=10, help="Number of parallel workers (default: 10)")
    run_parser.set_defaults(func=run_script)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
