# Black Network (NetSentinel) — Branche SOTA 2026

**Black Network** (NetSentinel) est une plateforme souveraine de pentest réseau automatisé et d'audit de sécurité intelligente. Conçu à l'origine pour une architecture d'audit en 4 phases (Cartographie, Empreinte, Interception, Man-In-The-Middle Proxy) dopée à l'IA, le projet intègre désormais dans cette branche les standards de cybersécurité émergents de **l'état de l'art 2026**.

---

## 🚀 Fonctionnalités Avancées (SOTA 2026)

Cette branche (`feature/sota-2026-integration`) introduit les piliers techniques majeurs suivants :

### 1. Cryptographie Post-Quantique (PQC) & Crypto-Agilité
* **Détection Quantique** : Analyse en direct de la robustesse des clés et algorithmes découverts sur les ports ouverts (ex. détection de SSH/RSA classique).
* **Menace HNDL (Harvest-Now-Decrypt-Later)** : Identification automatique des services vulnérables à l'interception immédiate pour décryptage ultérieur par ordinateur quantique.
* **Recommandations NIST** : Propositions de migration active vers les algorithmes post-quantiques normalisés (ex. ML-KEM / Kyber, ML-DSA) et architectures hybrides.

### 2. Validation Formelle des Actions par PDDL (Garde-Fou Agentique)
* **Garde-Fou Logique** : Pour éviter toute action destructive initiée par les agents IA (hallucinations), NetSentinel utilise un moteur de planification formelle PDDL.
* **Vérification de Préconditions** : Bloque automatiquement toute action système non sécurisée (ex. tentative d'isolement de la passerelle par défaut).

### 3. Architecture de SOC Agentique & Triage L1
* **Triage Automatique** : Triage et dé-duplication intelligente des alertes réseau de niveau L1 par des agents autonomes pour éliminer la fatigue d'alerte des analystes.
* **Copilote IA Bilingue** : Assistant conversationnel Gemini intégré capable d'échanger et de générer des rapports d'incident bilingues ( Kirundi / Français ).
* **Protocole MCP (Model Context Protocol)** : Maintien d'un contexte partagé synchronisé entre les outils d'audit locaux (nmap, tshark) et l'agent LLM.

### 4. Sécurisation et Gouvernance des Agents IA (Modèle Cisco)
* **Audit Forensic Local** : Journalisation immuable de toutes les interactions agent-système (prompts, actions, PDDL valid) persistée localement dans SQLite.
* **Sandboxing et Hardening** : Isolement des privilèges des agents IA s'exécutant sur des comptes de service dédiés sans clés API partagées.

### 5. Exposition Continue aux Menaces (CTEM & BAS)
* **Simulations d'Attaques (BAS)** : Outils interactifs permettant de simuler des scénarios de menaces réelles (scans agressifs, ARP Spoofing, mise à niveau PQC) pour valider l'intégrité opérationnelle du SOC.
* **Priorisation EPSS / SSVC** : Classement des vulnérabilités par exploitabilité réelle sur le terrain plutôt que par score CVSS statique.

---

## 🛠️ Stack Technique

* **Frontend** : Electron + React (TypeScript) + Tailwind CSS + Zustand + Framer Motion + D3.js (Topologie).
* **Backend** : Main process Electron orchestrant les binaires système (`nmap`, `tshark`, `mitmproxy`) et le moteur SQLite local.
* **Intelligence Artificielle** : API Google Gemini (`@google/generative-ai`) et validation logique formelle PDDL.

---

## 📁 Documentation Associée

Pour plus de détails sur la gouvernance, les budgets et l'architecture, consultez :
- [Architecture & Spécifications (docs/architecture.md)](./docs/architecture.md)
- [Cahier des Charges Original et Mis à jour (docx)](./NetSentinel_Cahier_des_Charges.docx)

---

## ⚙️ Installation et Lancement

### 1. Prérequis
Assurez-vous d'avoir les dépendances système requises installées sur votre OS Linux (Ubuntu 24.04 recommandé) :
```bash
sudo apt-get install nmap tshark wireshark-common arp-scan dsniff mitmproxy
```

### 2. Récupérer la Branche SOTA 2026
```bash
git checkout feature/sota-2026-integration
```

### 3. Installer les Dépendances
```bash
npm install
# Recompiler better-sqlite3 pour votre version Node locale si nécessaire :
npm rebuild better-sqlite3
```

### 4. Configuration d'Environnement
Créez un fichier `.env` à la racine et renseignez votre clé d'API Google Gemini :
```env
GEMINI_API_KEY=votre_cle_gemini_ici
```

### 5. Lancement
```bash
# Lancement de l'application Electron en mode dev
npm run dev

# Lancer la suite de tests unitaires Vitest (167 tests)
npm run test
```

---

## ⚖️ Avertissement Légal
NetSentinel est conçu **exclusivement** pour des missions d'audit réseau et de sensibilisation autorisées. Toute utilisation sur des infrastructures sans accord formel préalable est illégale.
