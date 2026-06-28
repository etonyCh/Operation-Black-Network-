# Black Network

**Black Network** est un outil de pentest réseau automatisé et intelligent. Il intègre une architecture en 4 phases (Cartographie, Empreinte, Interception, Man-In-The-Middle Proxy) dopée à l'intelligence artificielle (Gemini) pour fournir un diagnostic complet d'un réseau local et extraire des informations critiques telles que les vulnérabilités CVE ou les identifiants en transit.

## Fonctionnalités Principales

1. **Network Map (Découverte de réseau)**
   - Scan passif et actif via Nmap (ou P0f).
   - Visualisation via une grille dynamique ou un graphe topologique **D3.js**.

2. **Fingerprint (Prise d'empreinte & Détection de vulnérabilités)**
   - Détection de l'OS, adresse MAC, nom d'hôte et ports ouverts.
   - Matching automatique avec la base CVE via requêtes IA (Gemini).

3. **Traffic Dashboard (Interception réseau)**
   - Capture de paquets en temps réel (via tshark/Wireshark).
   - Extraction des identifiants (HTTP Basic, FTP, etc.).

4. **Proxy Interceptor (Man-In-The-Middle)**
   - ARP Spoofing ciblé.
   - Proxy HTTP/HTTPS permettant de bloquer, modifier et rejouer des requêtes interceptées.

## Technologie

- **Frontend** : Electron + React + Tailwind CSS + Zustand + shadcn/ui + framer-motion + D3.js.
- **Backend** : Main process Electron orchestrant les processus binaires natifs (`nmap`, `tshark`, `mitmproxy`).
- **Intelligence Artificielle** : API Gemini intégrée pour l'analyse des paquets et la recommandation sur les vulnérabilités (via module `ai.service.ts`).

## Documentation

Pour obtenir de plus amples détails sur l'architecture et les choix techniques du projet, veuillez consulter le dossier `/docs/` à la racine, et plus précisément :
- [Architecture & Spécifications techniques](./docs/architecture.md)

## Installation et Lancement

1. Clonez ce dépôt.
2. Assurez-vous d'avoir les prérequis natifs (`nmap`, `tshark`, `mitmproxy`) installés sur votre OS (Linux recommandé).
3. Installez les dépendances du projet :
   ```bash
   npm install
   ```
4. Ajoutez votre clé API Gemini au fichier `.env` :
   ```
   GEMINI_API_KEY=votre_cle_api_ici
   ```
5. Lancez l'application en environnement de développement :
   ```bash
   npm run dev
   ```

## Avertissement Légal
Black Network est conçu **exclusivement** pour des missions d'audit réseau autorisées. Toute utilisation sur des réseaux pour lesquels vous n'avez pas l'autorisation expresse du propriétaire est illégale et strictement interdite.
