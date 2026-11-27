import argparse
import socket
import subprocess
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlsplit
from urllib.request import ProxyHandler, build_opener
import webbrowser


class FrontendHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        file = Path(self.translate_path(self.path))
        if not file.exists() and not Path(urlsplit(self.path).path).suffix:
            self.path = "/index.html"
        return super().send_head()


class PreviewServer(ThreadingHTTPServer):
    allow_reuse_address = False

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


ADDRESS = "127.0.0.1"
PORT = 5173
URL = f"http://{ADDRESS}:{PORT}/"


def is_recovered_preview(index):
    opener = build_opener(ProxyHandler({}))
    try:
        with opener.open(URL, timeout=3) as response:
            return response.read() == index.read_bytes()
    except (OSError, URLError):
        return False


def open_preview():
    if not webbrowser.open_new_tab(URL):
        print(f"Open {URL} in your browser.", flush=True)


def start_backend():
    port = 8000
    project = Path(__file__).resolve().parent
    python = project / "backend" / ".venv" / "Scripts" / "python.exe"
    if not python.is_file():
        print("Backend dependencies are missing. See README-Recovery.md.", flush=True)
        return

    def running():
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=.5):
                return True
        except OSError:
            return False

    if running():
        return
    process = subprocess.Popen(
        [str(python), "-B", "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=project,
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
    )
    for _ in range(30):
        if running():
            print("InvestBiz FastAPI is available at http://localhost:8000/", flush=True)
            return
        if process.poll() is not None:
            break
        time.sleep(.2)
    print("FastAPI did not start on port 8000. See README-Recovery.md.", flush=True)


def main():
    parser = argparse.ArgumentParser(description="Serve the recovered InvestBiz frontend.")
    parser.add_argument("--open", action="store_true", help="Open InvestBiz in your browser.")
    args = parser.parse_args()
    if args.open:
        start_backend()
    project = Path(__file__).resolve().parent
    rebuilt = project / "dist-rebuilt"
    dist = rebuilt if (rebuilt / "index.html").is_file() else project / "dist"
    index = dist / "index.html"
    if not index.is_file():
        raise SystemExit("The recovered dist/index.html is missing.")

    if is_recovered_preview(index):
        print(f"InvestBiz is already running at {URL}", flush=True)
        if args.open:
            open_preview()
        return

    handler = partial(FrontendHandler, directory=str(dist))
    try:
        server = PreviewServer((ADDRESS, PORT), handler)
    except OSError:
        if not is_recovered_preview(index):
            raise SystemExit(f"Port {PORT} is unavailable. Close the program using that port and try again.")
        print(f"InvestBiz is already running at {URL}", flush=True)
        if args.open:
            open_preview()
        return

    with server:
        print(f"InvestBiz is available at {URL}", flush=True)
        if args.open:
            open_preview()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
