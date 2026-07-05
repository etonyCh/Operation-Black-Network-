# Black Network (NetSentinel)

**Black Network** (NetSentinel) est une plateforme souveraine et intelligente de cartographie réseau, de détection de vulnérabilités et d'analyse de sécurité en temps réel. Conçue avec une architecture modulaire et autonome, elle combine l'intelligence artificielle agentique à des mécanismes de validation formelle par planification PDDL et d'audit cryptographique post-quantique (PQC) pour fournir un diagnostic de sécurité réseau d'élite.

---

## 🚀 Fonctionnalités Principales

### 1. Cartographie & Découverte Réseau (Network Map)
* **Scan Actif et Passif** : Découverte d'hôtes et de services réseau via l'intégration automatisée de Nmap et P0f.
* **Topologie Interactive** : Représentation dynamique de la structure du réseau sous forme de graphe topologique interactif en **D3.js** ou de grille réactive.

### 2. Prise d'Empreinte & Vulnérabilités (Fingerprint)
* **Identification d'Équipements** : Détection fine des OS, adresses MAC, noms d'hôtes et ports ouverts.
* **Corrélation CVE / NVD** : Analyse automatisée et matching avec la base nationale des vulnérabilités (NVD) via l'IA (Gemini) pour repérer les failles de sécurité.

### 3. Interception de Trafic (Traffic Dashboard)
* **Capture Réseau en Temps Réel** : Écoute et capture des paquets transitant sur les interfaces locales (via Tshark/Wireshark).
* **Extraction d'Identifiants** : Analyse passive et détection automatique des identifiants (FTP, HTTP Basic, etc.) transmis en clair.

### 4. Proxy Intercepteur (MITM Proxy)
* **Spoofing ARP** : Redirection ciblée du trafic réseau pour auditer la résilience face aux attaques de l'homme du milieu.
* **Proxy d'Interception HTTP/HTTPS** : Interception, modification en direct et rejeu de requêtes web via l'intégration de Mitmproxy.

### 5. Audit Cryptographique Post-Quantique (PQC)
* **Diagnostic Post-Quantique** : Analyse en direct de la robustesse des clés et algorithmes cryptographiques face aux ordinateurs quantiques (menace *Harvest-Now-Decrypt-Later*).
* **Migration Hybride** : Recommandations d'activation de la crypto-agilité et des suites conformes au NIST (ML-KEM, ML-DSA).

### 6. SOC Agentique & Copilote IA
* **Triage L1 Autonome** : Analyse, dé-duplication et triage automatique des alertes par des agents IA pour éliminer la fatigue d'alerte.
* **Copilote IA Bilingue** : Assistant conversationnel intégré capable de répondre aux questions techniques et de générer des rapports détaillés en **Kirundi** et en **Français**.
* **Model Context Protocol (MCP)** : Synchronisation d'un contexte partagé et structuré entre le modèle IA et les outils de détection locaux.

### 7. Validation Formelle PDDL (Garde-Fou Logique)
* **Sécurisation des Actions** : Vérification des préconditions logiques par planification formelle PDDL avant l'exécution de remédiations (ex. blocage automatique de l'isolement de la passerelle réseau).
* **Audit Forensic Immuable** : Journalisation locale de chaque interaction agent-système et des statuts de validation PDDL dans une base SQLite.

### 8. Exposition Continue (CTEM & BAS)
* **Simulations d'Attaques (BAS)** : Déclenchement de scénarios réalistes (scans de ports, usurpations, configurations cryptographiques) pour auditer continuellement l'efficacité du SOC et de la planification de sécurité.

---

## 🛠️ Stack Technique

* **Frontend** : Electron + React (TypeScript) + Tailwind CSS + Zustand + Framer Motion + D3.js.
* **Backend** : Main process Electron orchestrant les binaires locaux (`nmap`, `tshark`, `mitmproxy`) et le moteur SQLite local.
* **Intelligence Artificielle** : API Google Gemini (`@google/generative-ai`) et planificateur logique PDDL.

---

## 📁 Documentation

Pour obtenir de plus amples détails sur l'architecture globale, la gouvernance et les choix de conception :
- [Architecture & Spécifications Techniques (docs/architecture.md)](./docs/architecture.md)
- [Cahier des Charges Réseau & SOC (docx)](./NetSentinel_Cahier_des_Charges.docx)

---

## ⚙️ Installation et Lancement

### 1. Prérequis
Installez les dépendances système requises sur votre OS Linux (Ubuntu 24.04 recommandé) :
```bash
sudo apt-get install nmap tshark wireshark-common arp-scan dsniff mitmproxy
```

### 2. Installation du Projet
Clonez le dépôt, puis installez les dépendances :
```bash
npm install
```

### 3. Recompilation SQLite
Recompilez la base de données native SQLite pour l'ABI d'Electron utilisée par Playwright et l'application :
```bash
npx -y @electron/rebuild -f -w better-sqlite3
```

### 4. Clé API Gemini
Créez un fichier `.env` à la racine et renseignez votre clé d'API :
```env
GEMINI_API_KEY=votre_cle_api_ici
```

### 5. Lancement
```bash
# Lancement de l'application en mode de développement
npm run dev

# Exécution des tests unitaires (Vitest)
npm run test

# Exécution des tests d'intégration de bout en bout (Playwright E2E)
ELECTRON_DISABLE_SANDBOX=1 xvfb-run -a npm run test:e2e
```

---

## ⚖️ Avertissement Légal
Black Network est conçu **exclusivement** pour des missions d'audit réseau et de sensibilisation autorisées. Toute utilisation sur des infrastructures sans accord formel préalable est illégale.
