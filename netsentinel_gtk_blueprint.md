# Master AI Developer Prompt: Native GTK4/Adwaita NetSentinel Application

You can feed the following prompt directly into an AI coding assistant to implement the entire NetSentinel application as a native Ubuntu application using Python and GTK4.

---

```markdown
You are an expert Linux Desktop Software Engineer specializing in the GNOME/GTK4 ecosystem and Python. 
Your task is to build **NetSentinel**, a state-of-the-art Network Penetration Testing and Security Auditing Platform designed as a native Ubuntu desktop application.

### Technical Stack Requirements
1. **Programming Language**: Python 3.12+ (standard library, `asyncio`, `sqlite3`, `socket`, `http.client`, etc.).
2. **UI Framework**: PyGObject with **GTK4** and **Libadwaita** (`Adw` library) for native Ubuntu dark/light integration, adaptive split views, and GNOME Human Interface Guidelines (HIG) compliance.
3. **Layout Definition**: UI layouts described in GNOME Blueprint markup or standard GTK4 XML GtkBuilder format.
4. **External Tooling Integration**: Asynchronous subprocess execution using python's `asyncio.subprocess` to control system binaries: `nmap`, `tshark`, `arp-scan`, `dsniff`, `mitmproxy`.

---

## 1. Application Architecture & UI Layout

The application must use `Adw.NavigationSplitView` to implement a sidebar navigation panel (left) and a main content area (right).

### Left Sidebar Navigation Items
1. **Network Map** (`Adw.NavigationPage`): D3-like network topology rendered via a custom GTK DrawingArea. Displays discovered hosts, active statuses, and links.
2. **Fingerprint** (`Adw.NavigationPage`): Port-scanner configuration. Displays enriched OS/vuln data, Post-Quantum Cryptography (PQC) readiness checklist, and Active Security Audits (BAS/CTEM).
3. **Traffic** (`Adw.NavigationPage`): Real-time packet sniffer feed and cleartext credentials extractor (HTTP/FTP/SMTP).
4. **Proxy** (`Adw.NavigationPage`): Man-in-the-Middle (MitM) web interceptor dashboard showing real-time HTTP requests, response inspector, and Request Replay controls.
5. **Enumeration** (`Adw.NavigationPage`): Dedicated active directory bruteforcing (web paths) and DNS record/subdomain brute-forcer.
6. **History** (`Adw.NavigationPage`): Session list management with device counts, risk score summary, and database load/create controls.
7. **Reports** (`Adw.NavigationPage`): Markdown-to-PDF report generator summarizing session audits.
8. **Settings** (`Adw.NavigationPage`): API Key configuration (Gemini API for the AI Copilote), network interface selector, and Light/Dark preference.

---

## 2. Core Backend Services (Python Asyncio)

You must write modular, thread-safe, and asynchronous Python services for the backend routines.

### A. SQLite Database & Storage Engine (`database.py`)
Implement a SQLite connection manager using standard library `sqlite3`. Execute the database schema initialization on startup. Use `PRAGMA foreign_keys = ON;` and `PRAGMA journal_mode = WAL;`.
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target TEXT,
  notes TEXT,
  risk_score REAL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  ip TEXT NOT NULL,
  mac TEXT,
  hostname TEXT,
  vendor TEXT,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'online',
  ports TEXT, -- JSON array of ports
  os TEXT,
  discovered_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vulnerabilities (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  cve_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  cvss TEXT,
  port INTEGER,
  service TEXT,
  solution TEXT,
  refs TEXT,
  discovered_at INTEGER NOT NULL,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS traffic_packets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  src_ip TEXT NOT NULL,
  dst_ip TEXT NOT NULL,
  src_port INTEGER,
  dst_port INTEGER,
  protocol TEXT NOT NULL,
  length INTEGER NOT NULL,
  info TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  protocol TEXT NOT NULL,
  src_ip TEXT NOT NULL,
  dst_ip TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT,
  password TEXT,
  type TEXT NOT NULL DEFAULT 'plaintext',
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_audit_logs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  input TEXT,
  output TEXT,
  pddl_valid INTEGER NOT NULL DEFAULT 1,
  pddl_rule TEXT
);
```

### B. Network Scanner Service (`scanner_service.py`)
Wrapper around `arp-scan` and `nmap`.
- **Active Discovery**: Runs `arp-scan --localnet` or `nmap -sn` asynchronously. Parses output lines to extract IP, MAC, and vendor. Emits a GObject signal `device-discovered` for each hit.
- **Port Scanner & Vuln Analyzer**: Runs `nmap -sV -O --script vuln -oX -` on selected targets. Parses the generated XML output to construct enriched `Port` models and `Vulnerability` arrays, saved directly to SQLite.

### C. Traffic Capture Service (`traffic_service.py`)
Uses `tshark` to sniff live raw sockets.
- Spawns `tshark -i <interface> -T ek -l -e frame.len -e frame.time_epoch -e ip.src -e ip.dst -e tcp.srcport -e tcp.dstport -e udp.srcport -e udp.dstport -e frame.protocols -e col.info`
- Parses stdout line-buffered JSON records. Extracts packet metadata and emits `packet-captured` signals.
- Implements regex-based protocol sniffers (FTP, SMTP, HTTP Basic Auth) on raw fields to intercept cleartext credentials. Saves intercepted profiles to the `credentials` SQLite table.

### D. MitM Web Proxy Service (`proxy_service.py`)
Spawns `mitmdump --listen-port <port> -s addon.py` to capture HTTP/HTTPS traffic.
- **Python Addon Script (`addon.py`)**: Intercepts `request` and `response` objects, writes serialized JSON objects directly to standard output.
- **IPC Reader**: The main Python application reads the proxy stdout line-by-line, populates the `proxy_requests` and `proxy_responses` tables, and broadcasts updates.
- **Replay Controller**: Uses Python's native `http.client` / `urllib` to replay requests with custom headers/payload edits.

### E. Active Enumeration Service (`enumeration_service.py`)
Runs real-time active audits on target endpoints:
- **Directory Bruteforcer**: Given a target URL (e.g., `http://192.168.1.10/`), performs async HTTP GET queries using `asyncio` and `urllib` over a built-in wordlist of 40 sensitive directories (e.g. `/admin`, `/.env`, `/backup.zip`, `/config.json`, `/db`). Reports HTTP status codes (200, 301, 403, 500) and content sizes. Paces queries with a 20ms delay.
- **DNS Record Resolver & Subdomain Scanner**: Query standard records (A, AAAA, MX, NS, TXT) via `socket` / `dns.resolver`. Bruteforces 36 common subdomains (e.g. `vpn.target.com`, `mail.target.com`, `dev.target.com`) through direct DNS name resolution.

---

## 3. Agentic SOC & PDDL Guardrails

To enforce automated, logical guardrails before executing response actions proposed by LLM agents:

### PDDL Safety Domain
Define logical preconditions for safety validation (e.g. `gateway_ip` cannot be isolated or patched directly during active maintenance).
Implement a logical validator (`pddl_validator.py`):
```python
def validate_action_with_pddl(action: str, target_ip: str, gateway_ip: str = "192.168.1.1") -> dict:
    # Precondition checking
    if action == "isolate-system":
        if target_ip == gateway_ip:
            return {
                "is_valid": False,
                "rule_violated": "default_gateway_must_be_active",
                "explanation": "Action BLOQUÉE par le garde-fou PDDL. La passerelle réseau par défaut ne peut pas être isolée."
            }
        return {
            "is_valid": True,
            "explanation": "Action validée par PDDL. L'hôte cible n'est pas un actif critique."
        }
    
    if action == "patch-system":
        if target_ip == gateway_ip:
            return {
                "is_valid": False,
                "rule_violated": "require_gateway_failover_before_patch",
                "explanation": "Action BLOQUÉE. L'application de correctifs sur la passerelle exige un basculement vers un commutateur secondaire actif."
            }
        return {
            "is_valid": True,
            "explanation": "Action de patch validée par PDDL."
        }
    
    return {"is_valid": True, "explanation": "Action approuvée."}
```
Log each L1/L2 action execution, its validation status, and rule outcomes directly to the `agent_audit_logs` table.

---

## 4. UI Layout & View Details

Implement the UI with standard GTK4 widgets packaged under a dark stylesheet (`Adw.StyleManager` set to Dark).

1. **Dashboard Split-view**:
   - Sidebar: `Adw.NavigationSplitView` with a list box (`Gtk.ListBox`) to switch between navigation pages.
   - Header: `Adw.HeaderBar` containing title and window controls.
2. **Directory & DNS Enumeration Dashboard**:
   - Split tab layout (`Gtk.Notebook` or `Adw.ViewStack` with `Adw.ViewSwitcher`).
   - Tab 1: Directory Bruteforcing. Saisie target URL, bouton "Lancer l'Audit Web" (vert) / "Arrêter l'Audit" (rouge), barre de progression (`Gtk.ProgressBar`), et tableau (`Gtk.ColumnView` ou `Gtk.ListView` utilisant un `Gtk.StringList`) listant les colonnes : Chemin, Code d'état, Taille de réponse, Redirection.
   - Tab 2: DNS & Subdomain. Saisie du domaine, bouton de lancement, barre de progression, et tableau de résultats : Domaine résolu, Type d'enregistrement, Valeur.
3. **SOC logs pane**:
   - Display a log list showing chronological events from the `agent_audit_logs` SQLite table. Colour-code PDDL block events in red, and valid events in green.

Provide the complete python code structure, UI class declarations, GObject signal bindings, and asynchronous loops ensuring the UI thread is never blocked. Use `asyncio` loop integration with GLib loop via `gbulb` or run system sub-processes in background threads communicating back to the GLib main thread using `GLib.idle_add()`.
```
```

---

Dites-moi "Prêt" pour que je commence à rédiger le code d'implémentation de cette structure native GNOME/GTK4 !
