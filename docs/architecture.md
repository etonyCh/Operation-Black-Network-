
| NetSentinel Plateforme GUI de Pentest & Audit Réseau Ubuntu 24.04 LTS  ·  Cybersécurité × IA  CAHIER DES CHARGES TECHNIQUE Version 1.0  —  Juin 2025 [ USAGE ÉDUCATIF & PROFESSIONNEL UNIQUEMENT ] |
| --- |

## Historique des Versions

| Version | Date | Auteur | Description des modifications |
| --- | --- | --- | --- |
| 0.1 | 15 Mai 2025 | tonyCh | Version initiale (ébauche et périmètre technique) |
| 1.0 | Juin 2025 | tonyCh | Version de base pour le lancement fonctionnel |
| 1.1 | Juillet 2026 | tonyCh | Mise à jour complète : ajout des sections fonctionnelles, cybersécurité détaillée (PDDL), budget, UAT, SLA et gouvernance. |

# 1. Introduction & Vision du Projet

NetSentinel est une application desktop native Ubuntu conçue pour démocratiser l'audit de sécurité réseau. Elle offre une interface graphique moderne et intuitive qui orchestre des outils de pentest de classe professionnelle (nmap, Wireshark, Metasploit, Burp Suite) sans que l'utilisateur ait besoin de saisir une seule commande.

Ce projet s'inscrit dans une démarche d'apprentissage avancé à l'intersection de la Cybersécurité et de l'Intelligence Artificielle. L'IA est intégrée à chaque étape pour contextualiser les résultats, suggérer des vecteurs d'attaque, et automatiser la rédaction de rapports.

## 1.1 Objectifs Stratégiques

- Créer une interface 100% GUI : zéro commande terminale requise pour l'utilisateur final
- Couvrir le cycle complet d'un pentest : découverte, fingerprinting, capture trafic, interception active
- Intégrer des outils SOTA (State-of-the-Art) validés par la communauté professionnelle
- Générer automatiquement des rapports d'audit professionnels en PDF/DOCX
- Proposer une assistance IA contextuelle pour l'analyse et les recommandations

## 1.2 Avertissement Légal & Éthique

| ⚖️ LÉGAL | NetSentinel est exclusivement destiné à l'audit de réseaux dont vous êtes propriétaire ou pour lesquels vous disposez d'une autorisation écrite explicite. Toute utilisation non autorisée constitue une infraction pénale. Ce document est produit dans un cadre éducatif. |
| --- | --- |

# 2. Contexte, Périmètre & Utilisateurs Cibles

## 2.1 Contexte

Les outils de sécurité réseau professionnels souffrent d'une courbe d'apprentissage très élevée : Nmap nécessite la maîtrise de dizaines d'options CLI, Wireshark requiert une expertise en protocoles réseau, Metasploit Framework impose la compréhension d'un système de modules complexe. NetSentinel abstrait cette complexité derrière une interface guidée, tout en exposant la puissance complète des outils sous-jacents.

## 2.2 Utilisateurs Cibles

| Profil | Description & Besoins |
| --- | --- |
| Étudiant CyberSec | Apprend les concepts de pentest avec feedback visuel immédiat et explications IA intégrées |
| Ingénieur Réseau | Audite son propre réseau d'entreprise sans expertise offensive approfondie |
| Pentester Junior | Accélère son workflow grâce à l'automatisation et à la génération de rapports |
| Chercheur Sécurité | Reproduit des environnements de test et documente les découvertes rapidement |

## 2.3 Périmètre Fonctionnel

L'application couvre 4 phases de pentest réseau :

| Phase | Nom | Outil Principal | Livrable UI |
| --- | --- | --- | --- |
| Phase 1 | Scan & Cartographie | nmap / arp-scan | Carte réseau interactive avec cards par appareil |
| Phase 2 | Fingerprinting & Vulnérabilités | nmap -A / masscan | Rapport détaillé par appareil avec CVE associées |
| Phase 3 | Analyse de Trafic | tshark / Wireshark | Dashboard trafic temps réel avec alertes protocoles |
| Phase 4 | Interception MitM | mitmproxy / Burp Suite | Proxy intercepteur avec analyse de requêtes web |

# 3. Stack Technologique — Choix & Justifications

Le choix technologique est contraint par deux impératifs : la compatibilité native Ubuntu 24.04 LTS et la capacité à piloter des outils système bas-niveau (capture réseau, injection de paquets). Voici le stack retenu :

## 3.1 Frontend & Framework UI

| Composant | Technologie | Rôle / Justification |
| --- | --- | --- |
| Framework UI | Electron 30 + React 18 | Cross-desktop natif Linux, accès Node.js pour les appels système, NPM ecosystem |
| Langage | TypeScript 5.x | Typage statique pour fiabilité, autocomplete, meilleure maintenabilité du code |
| UI Components | shadcn/ui + Tailwind CSS | Composants accessibles, design system cohérent, dark mode natif |
| Charts & Viz | D3.js v7 + Recharts | Visualisation réseau interactive (graphe de topologie), courbes temps réel |
| State Manager | Zustand + TanStack Query | État global léger, cache et synchronisation des données réseau |
| Animations | Framer Motion | Transitions fluides pour les cards, dashboards et alertes temps réel |

## 3.2 Backend & Orchestration

| Composant | Technologie | Rôle / Justification |
| --- | --- | --- |
| Runtime | Node.js 22 LTS (Electron main) | Exécution de processus système, gestion des sockets Unix/TCP |
| Process Manager | child_process + execa | Spawn nmap/tshark avec parsing stdout en temps réel via streams |
| Base de données | SQLite 3 (better-sqlite3) | Stockage local des scans, historique, résultats fingerprinting — zéro serveur |
| API Interne | IPC Electron (ipcMain/ipcRenderer) | Communication sécurisée entre frontend React et backend Node.js |
| Queue de tâches | Bull + Redis (optionnel) | File d'attente pour scans simultanés, gestion des timeouts |

## 3.3 Outils de Sécurité Intégrés (SOTA)

| Composant | Technologie | Rôle / Justification |
| --- | --- | --- |
| Scan Réseau | nmap 7.95 + arp-scan | nmap : gold standard du scan réseau. arp-scan : plus rapide en LAN, détection MAC précise |
| Fingerprinting OS | nmap -A + p0f | nmap -A : détection OS/services/scripts. p0f : fingerprinting passif (non intrusif) |
| Capture Trafic | tshark (CLI Wireshark) | tshark permet parsing programmatique JSON, idéal pour intégration dans l'UI |
| Proxy Web | mitmproxy 10.x | API Python + WebSocket, plus facilement intégrable que Burp en standalone |
| Analyse CVE | vulners NSE + NVD API | Script NSE vulners pour corrélation automatique avec la base CVE NIST |
| Analyse IA | Anthropic Gemini API | Contextualisation des résultats, suggestions d'exploitation, rédaction rapports |

## 3.4 Environnement de Build & Distribution

| Composant | Technologie | Rôle / Justification |
| --- | --- | --- |
| Bundler | Vite 5 + electron-vite | Build ultra-rapide, HMR en dev, optimisation prod |
| Packaging | electron-builder | Génère .deb, .AppImage, .snap pour Ubuntu — installation en un clic |
| Containerisation | Docker (dev env) | Environnement de développement reproductible, tests isolés |
| CI/CD | GitHub Actions | Tests automatiques, build multi-arch, release automatisée |
| Tests | Vitest + Playwright | Tests unitaires + E2E pour les workflows de scan |

# 4. Architecture Système

## 4.1 Architecture Globale

NetSentinel suit une architecture 3-tiers adaptée à Electron :

| COUCHE 1 | Renderer Process (React/TypeScript) : Interface utilisateur, visualisations, gestion de l'état UI |
| --- | --- |

| COUCHE 2 | Main Process (Node.js) : Orchestrateur système, spawn des outils, parsing des résultats, SQLite |
| --- | --- |

| COUCHE 3 | Outils Système (nmap/tshark/mitmproxy) : Exécutés en processus enfants avec permissions root via pkexec |
| --- | --- |

## 4.2 Gestion des Permissions Root

Les outils de sécurité réseau nécessitent des privilèges root (capture de paquets, scan SYN). NetSentinel gère cela via :
- pkexec (PolicyKit) pour les élévations ponctuelles avec boîte de dialogue graphique Ubuntu
- Capabilities Linux (cap_net_raw, cap_net_admin) assignées aux binaires via setcap
- Jamais de lancement global en root de l'application complète

## 4.3 Flux de Données

| Étape | Description du Flux |
| --- | --- |
| 1. Saisie UI | L'utilisateur configure un scan via l'interface React (plage IP, options) |
| 2. IPC Call | Le Renderer envoie une commande IPC au Main Process avec les paramètres |
| 3. Spawn Tool | Le Main Process lance nmap/tshark via execa avec parsing stream JSON |
| 4. Real-time Push | Les résultats sont streamés ligne par ligne vers le Renderer via IPC events |
| 7. Persistence | Chaque résultat est sauvegardé en SQLite pour historique et rapports |
| 10. AI Analysis | Les données brutes sont envoyées à l'API Gemini pour contextualisation |
| 13. Render | Le Renderer affiche les cards, graphes et alertes en temps réel |

# 5. Spécifications Fonctionnelles

Cette section formalise les cas d'usage transverses et la gestion des utilisateurs au sein de la plateforme NetSentinel.

## 5.1 Tableau de Bord SOC (Security Operations Center)

Le tableau de bord SOC constitue l'interface centrale de NetSentinel. Il fournit une vue d'ensemble en temps réel de l'état de sécurité du réseau audité :
• Visualisation en temps réel de la topologie réseau découverte (graphe interactif D3.js).
• Indicateur du niveau de menace global calculé dynamiquement (Risk Score).
• Flux de notifications d'incidents et d'alertes de sécurité classés par ordre de sévérité.
• Raccourcis pour initier des actions rapides (isolation réseau, scan agressif, etc.).

## 5.2 Workflow d'Alerte et Notification

Dès qu'une vulnérabilité critique ou un comportement suspect (ex. protocole non chiffré) est détecté :
1. Détection : Le service arrière (tshark, nmap) lève un événement contenant les métadonnées de la menace.
2. Notification UI : Un toast animé apparaît immédiatement à l'écran de l'opérateur.
3. Diagnostic IA : Un clic sur l'alerte ouvre un drawer latéral affichant une explication générée par l'API Gemini et une suggestion de remédiation.
4. Remédiation : L'opérateur peut valider d'un clic l'action recommandée (ex. exécuter le playbook de blocage).

## 5.3 Rôles Utilisateurs et Habilitations

NetSentinel définit trois profils d'utilisateurs distincts pour sécuriser l'usage de la plateforme :
• Administrateur (Tech Lead / Auditeur Principal) : Dispose d'un accès complet à toutes les fonctionnalités, y compris la configuration active du proxy d'interception (MitM) et l'élévation de permissions système.
• Auditeur Sécurité (Junior) : Peut lancer des scans réseau, observer le trafic en temps réel et générer des rapports d'audit, mais n'a pas l'autorisation de modifier les requêtes interceptées.
• Apprenant / Étudiant : Profil bridé à usage éducatif. L'assistance IA explicative est activée au maximum. Les scans sont limités aux plages de réseau local privées (RFC 1918) pour éviter tout usage offensif externe.

## 5.4 Gestion des Habilitations et Privilèges

Afin de respecter le principe du moindre privilège, l'application n'est jamais exécutée dans son ensemble avec les droits root. L'élévation de privilèges est gérée de manière granulaire :
• Utilisation de PolicyKit (pkexec) avec boîte de dialogue graphique pour authentifier l'opérateur avant d'assigner des privilèges réseau temporaires.
• Application persistante des capabilities Linux (cap_net_raw, cap_net_admin) sur les binaires spécifiques (nmap, tshark) lors de l'installation pour éliminer le besoin de sudo en cours d'exécution.

# 6. Spécifications Non-Fonctionnelles

Cette section définit les exigences de qualité de service, de sécurité de l'information et de résilience de NetSentinel.

## 6.1 Latence Maximale de l'Interface

• Latence de réponse de l'IHM aux interactions utilisateur : inférieure à 100 ms.
• Rafraîchissement des graphiques de trafic temps réel (Phase 3) : latence de rendu inférieure à 500 ms.
• Temps de traitement des requêtes de base de données locale (SQLite) : inférieur à 200 ms.

## 6.2 Disponibilité et Autonomie

• NetSentinel est conçue pour fonctionner de manière autonome (100% offline) pour l'ensemble des tâches d'audit et d'analyse réseau local.
• La base de données SQLite locale assure un accès instantané à l'historique des sessions et aux CVE sans nécessiter de connexion internet.
• Seul le module d'assistance IA contextuelle requiert un accès HTTPS externe vers l'API Gemini (avec fallback dégradé en mode hors-ligne).

## 6.3 Chiffrement et Sécurisation

• Base de données SQLite chiffrée de bout en bout en AES-256 avec un mot de passe dérivé de l'identifiant de session de l'utilisateur.
• Clés API d'assistance IA stockées de manière sécurisée dans le trousseau de clés du système d'exploitation hôte (via libsecret sur Ubuntu).
• Flux de données réseau sensibles interceptés (Phase 4) isolés dans un répertoire temporaire chiffré en mémoire vive (tmpfs) et purgés dès la fermeture de la session.

## 6.4 Volumétrie de Logs et Performance Réseau

• Capacité de traitement de tshark : jusqu'à 10 000 paquets par seconde sur une interface Gigabit sans perte de paquets.
• Stockage des logs : taille maximale de log par session fixée à 100 Mo avec un mécanisme de rotation circulaire automatique.

## 6.5 Plan de Reprise après Sinistre (RTO / RPO)

• RTO (Recovery Time Objective) : inférieur à 5 minutes pour restaurer l'application à son état opérationnel initial après un crash système.
• RPO (Recovery Point Objective) : inférieur à 1 minute. Les données de scan et de capture de trafic sont sauvegardées de manière transactionnelle en base SQLite toutes les 30 secondes pour minimiser les pertes de données en cas de coupure de courant.

## 6.6 Cryptographie Post-Quantique (PQC) & Crypto-Agilité

• Contexte et Menace "Harvest-Now-Decrypt-Later" : Pour protéger les données à confidentialité longue durée (bancaires de la BRB, médicales et électorales) contre l'interception immédiate et le déchiffrement ultérieur par ordinateur quantique, NetSentinel intègre des mesures de protection quantique.
• Principe de Crypto-Agilité : L'architecture logicielle sépare strictement la couche protocolaire de l'implémentation des algorithmes. Cela permet de basculer de TLS 1.3 standard vers des algorithmes post-quantiques (ex. ML-KEM, ML-DSA) sans réécriture du code de l'application (via des modules cryptographiques interchangeables).
• Inventaire Cryptographique : NetSentinel intègre un module d'inventaire découvrant les algorithmes de chiffrement utilisés sur les machines critiques du parc afin d'identifier les systèmes vulnérables aux ordinateurs quantiques.
• Feuille de Route de Migration : Établissement d'une migration en trois étapes : 1) Audit et inventaire cryptographique du parc, 2) Déploiement d'algorithmes hybrides (combinaison d'algorithmes classiques et post-quantiques) sur les flux de données critiques, 3) Migration complète vers des suites 100% PQC d'ici 2030 (conformément aux échéances internationales de conformité et de certification nationale "visa de sécurité").

# 7. Spécifications Fonctionnelles Détaillées

## 7.1 Phase 1 — Scan & Cartographie Réseau

### 7.1.1 Description Fonctionnelle

L'utilisateur lance un scan de découverte sur sa plage réseau. L'application détecte tous les appareils connectés et les affiche sous forme de cartes visuelles interactives sur une vue "Network Map".

### 7.1.2 Interface Utilisateur — Network Map

- Vue principale : grille de cards avec animation d'apparition au fur et à mesure de la découverte
- Card Appareil : icône selon le type (router, smartphone, PC, caméra IoT, serveur, inconnu)
- Contenu de la card : adresse IP, hostname, fabricant (vendor MAC), type d'appareil, statut (online/offline), temps de réponse ping
- Filtres : par type d'appareil, par sous-réseau, par statut
- Vue alternative : topologie réseau (graphe D3.js) montrant les connexions
- Badge temps réel : compteur d'appareils découverts pendant le scan

### 7.1.3 Outils & Commandes Orchestrées

| Outil | Usage & Paramètres |
| --- | --- |
| nmap -sn | Ping scan rapide : nmap -sn --min-rate=1000 192.168.1.0/24 -oX - |
| arp-scan | Scan ARP LAN ultra-rapide : arp-scan --localnet --interface=eth0 |
| nmap -sV | Détection des ports ouverts principaux (ports 22,80,443,8080) |
| OUI Lookup | Requête base MAC-vendor locale (IEEE OUI database) pour identifier le fabricant |

### 7.1.4 Parsing & Enrichissement

- Parse XML nmap en temps réel avec xml2js pour mise à jour progressive des cards
- Lookup OUI automatique depuis la base de données locale (ieee-mac-vendor npm)
- Classification automatique du type d'appareil via heuristiques : ports ouverts + vendor + hostname
- Géolocalisation optionnelle des IPs publiques via ip-api.com

## 7.2 Phase 2 — Fingerprinting & Analyse de Vulnérabilités

### 7.2.1 Description Fonctionnelle

En cliquant sur une card de la Phase 1, l'utilisateur lance un fingerprinting approfondi de l'appareil sélectionné. Un panneau latéral (drawer) ou une vue détail s'ouvre et se remplit progressivement pendant le scan.

### 7.2.2 Interface Utilisateur — Device Detail View

- Panneau latéral droit animé (slide-in) au clic sur une card
- Onglets : Aperçu / Ports & Services / OS Detection / Vulnérabilités / IA Analysis
- Onglet Ports : liste des ports ouverts avec service, version, protocole et état
- Onglet OS : OS détecté avec score de confiance, kernel estimé, architecture
- Onglet Vulnérabilités : liste des CVE avec score CVSS, sévérité (badge coloré), description et lien NVD
- Onglet IA : analyse de Claude expliquant les risques en langage naturel et recommandations de remédiation

### 7.2.3 Outils & Commandes Orchestrées

| Outil | Usage |
| --- | --- |
| nmap -A | Détection OS + versions services + scripts NSE par défaut sur l'IP cible |
| nmap --script vulners | Corrélation automatique des services détectés avec la base CVE via le script NSE vulners |
| p0f | Fingerprinting passif (observation du trafic existant, non intrusif) |
| NVD API v2.0 | Enrichissement CVE : score CVSS, vecteur d'attaque, disponibilité des patches |
| Gemini API | Analyse contextuelle : expliquer les CVE, prioriser les risques, rédiger recommandations |

## 7.3 Phase 3 — Analyse de Trafic Réseau

### 7.3.1 Description Fonctionnelle

L'utilisateur active la capture de trafic sur une interface réseau choisie. L'application analyse le trafic en temps réel et identifie les protocoles non chiffrés, les credentials en clair et les patterns suspects.

### 7.3.2 Interface Utilisateur — Traffic Dashboard

- Sélecteur d'interface réseau (dropdown : eth0, wlan0, etc.)
- Bouton START/STOP capture avec indicateur visuel (pulsing dot rouge)
- Graphique temps réel : débit réseau par protocole (HTTP, HTTPS, DNS, FTP, Telnet...)
- Feed de paquets : liste scrollable des paquets capturés avec coloration syntaxique par protocole
- Panneau Alertes : notifications immédiates pour protocoles non chiffrés détectés
- Extracteur Credentials : tableau dédié affichant usernames/passwords en clair interceptés
- Filtre BPF intégré : champ de saisie pour filtres Wireshark (ex: 'http and tcp.port==80')

### 7.3.3 Outils & Commandes Orchestrées

| Outil | Usage |
| --- | --- |
| tshark | Capture et parsing en JSON temps réel : tshark -i wlan0 -T json -l |
| tshark -Y | Filtrage applicatif : tshark -Y 'ftp or telnet or http' pour protocoles non chiffrés |
| tshark -z | Statistiques agrégées : io,stat pour graphiques débit, conv,tcp pour connexions |
| dsniff | Extraction automatique de credentials en clair (FTP, Telnet, HTTP Basic Auth) |
| NetworkMiner | Reconstruction de fichiers transférés (images, documents) depuis le trafic capturé |

## 7.4 Phase 4 — Interception Active (Man-in-the-Middle)

### 7.4.1 Description Fonctionnelle

L'utilisateur configure un proxy d'interception entre une machine cible et le réseau. Il peut visualiser, modifier et rejouer les requêtes HTTP/HTTPS. L'IA analyse les requêtes pour détecter des failles XSS, SQLi et autres vulnérabilités web.

### 7.4.2 Interface Utilisateur — Proxy Interceptor

- Configuration guidée ARP Spoofing : sélection IP cible et IP gateway avec explications
- Vue Requêtes/Réponses : split-view avec liste des requêtes à gauche, détail à droite
- Editeur de requêtes intégré : modification des headers, body, cookies avec syntaxe highlighting
- Bouton Rejouer : re-envoyer une requête modifiée et voir la réponse différentielle
- Scanner automatique : bouton 'Analyser avec IA' pour détecter SQLi/XSS/SSRF dans les paramètres
- Timeline : vue chronologique de la session avec regroupement par domaine

### 7.4.3 Outils & Commandes Orchestrées

| Outil | Usage |
| --- | --- |
| mitmproxy 10.x | Proxy HTTP/HTTPS avec API WebSocket pour intégration temps réel dans l'UI |
| arpspoof / ettercap | ARP Poisoning pour rediriger le trafic de la cible vers la machine attaquante |
| sslstrip2 | Downgrade HTTPS vers HTTP pour les sites non HSTS |
| Gemini API | Analyse des paramètres GET/POST pour détection de patterns SQLi, XSS, Path Traversal |

## 7.5 Validation Formelle des Plans d'Action par PDDL (Garde-Fou Agentique)

• Problématique de la Boîte Noire : Les agents IA basés sur des LLMs peuvent souffrir d'hallucinations et proposer des actions destructrices ou incohérentes (ex. isoler un serveur DHCP critique lors d'une fausse alerte).
• PDDL comme Filtre de Sécurité : NetSentinel utilise le moteur de planification PDDL comme une couche de validation formelle mathématiquement vérifiable. Les plans d'action générés par l'IA agentique (triage, blocage, remédiation) sont traduits en états et en buts PDDL, puis validés par le planificateur local.
• Contrôle Humain-Vérifiable (Human-in-the-Loop) : Si le plan proposé par l'IA viole une précondition ou un invariant logique de sécurité (ex. préserver la connectivité de la passerelle par défaut), le planificateur PDDL bloque l'action, génère une alerte d'incohérence et présente à l'analyste un arbre de décision explicable. Seuls 14% des responsables sécurité mondiaux autorisant l'autonomie complète des agents IA, ce garde-fou formel PDDL constitue le pilier de confiance de NetSentinel.

# 8. Module Intelligence Artificielle (Détaillé)

Ce module détaille l'intégration et la supervision des fonctionnalités d'intelligence artificielle au sein de la plateforme.

## 8.1 Provenance et Gouvernance des Données d'Entraînement

Le module IA repose sur l'API Google Gemini 1.5 Pro. Les données d'entraînement des invites système (system prompts) proviennent de sources fiables et ouvertes :
• La base de données nationale des vulnérabilités (NVD) du NIST pour les descriptions de failles et scores CVSS.
• Les référentiels de sécurité OWASP (Web and Mobile Security Projects) pour la remédiation.
• Des documentations officielles d'outils réseau open-source (nmap, Wireshark, mitmproxy).
Gouvernance : Aucune donnée de capture réseau contenant des informations personnelles identifiables (PII) n'est transmise aux serveurs de Google. Seules les métadonnées anonymisées (identifiants de ports, numéros de CVE, versions de logiciels détectées) sont envoyées à l'API après consentement de l'utilisateur. Google n'utilise pas ces requêtes pour entraîner ses modèles (mode API payante avec clause de confidentialité stricte).

## 8.2 Cadence de Ré-entraînement et Mises à Jour

• Base de connaissances locale : synchronisation quotidienne avec l'API NVD pour les nouvelles signatures de vulnérabilités.
• Modèles d'invites IA : mise à jour mensuelle des structures d'invites système par l'équipe de développement pour intégrer les nouveaux vecteurs d'attaque détectés dans la communauté.

## 8.3 Mécanisme d'Explicabilité (XAI)

Pour garantir la transparence pédagogique, chaque recommandation IA doit être étayée. L'IA génère un rapport structuré découpé en trois parties :
1. Constat (Evidence) : Rappel des éléments factuels ayant mené au diagnostic (ex. 'Port 21 ouvert détecté avec service vsftpd 2.3.4').
2. Explication logique : Vulgarisation du fonctionnement technique de la faille corrélée (ex. backdoor connue dans cette version de service).
3. Remédiation : Instructions étape par étape pour corriger la faille (ex. mise à jour du paquet ou modification du fichier de configuration).

## 8.4 Supervision Humaine (Human-in-the-Loop)

Conformément aux principes éthiques du projet, l'IA agit uniquement comme un assistant décisionnel. L'IA ne dispose d'aucun droit d'écriture direct sur le réseau ou le système hôte. Toute action de remédiation recommandée par l'IA (comme bloquer une adresse IP ou isoler un appareil) doit être explicitement validée par l'opérateur humain via une boîte de confirmation dans l'interface graphique de NetSentinel.

## 8.5 Sécurisation et Gouvernance des Agents IA (Modèle de Confiance Cisco 2026)

Les statistiques de 2026 montrant que 88% des organisations font face à des incidents liés aux agents IA en raison d'un manque de supervision et de journalisation, NetSentinel applique une politique stricte de sécurité des agents IA articulée autour de trois axes :
• Axe 1 — Protéger le monde des agents (Contrôle d'action) : Les agents IA s'exécutent dans des bacs à sable stricts (sandboxing Electron/Node). Leurs habilitations sont limitées via le protocole PolicyKit. Aucun agent ne peut exécuter de commandes shell arbitraires.
• Axe 2 — Protéger les agents du monde (Robustesse et Intégrité) : Mise en œuvre de filtres de nettoyage (input sanitization) pour bloquer les attaques par injection de prompts (Prompt Injection) et d'analyses heuristiques sur les flux réseau pour empêcher l'empoisonnement de modèle (Model Poisoning) via des paquets malveillants.
• Axe 3 — Détection et Réponse à la vitesse machine (Audit & Journalisation) : Chaque agent IA dispose de ses propres identifiants et clés API cryptographiques (pas de clés d'API partagées). Enregistrement systématique de toutes les interactions agent-système (prompts, réponses, actions décidées, scores de confiance) dans une table d'audit SQLite locale chiffrée, permettant une traçabilité forensic complète.

# 9. Module Cybersécurité (Détaillé)

Cette section détaille les protocoles de réponse aux incidents, les politiques de journalisation et d'intégration de NetSentinel.

## 9.1 Playbooks d'Incident par Type de Menace

L'application intègre des playbooks de sécurité interactifs pour guider l'opérateur lors de la détection de menaces courantes :
• Playbook ARP Spoofing : Détection d'un conflit d'adresses MAC -> Alerte prioritaire -> Suggestion d'exécution du plan d'isolement (PDDL isolate-system) -> Envoi de paquets ARP légitimes pour restaurer la table ARP -> Blocage MAC de l'attaquant au niveau du commutateur local.
• Playbook Port Scan Agressif : Détection de scans SYN rapides -> Identification de la source -> Option d'ajout automatique d'une règle iptables sur le poste pour bloquer l'IP scanneuse.
• Playbook Credentials Leak : Interception d'un mot de passe FTP/Telnet en clair -> Identification de la machine victime -> Notification push -> Proposition de génération d'un mot de passe fort et envoi d'une alerte à l'administrateur.

## 9.2 Politique de Rétention des Logs

• Les captures brutes de trafic réseau (.pcap) sont conservées localement pendant un maximum de 30 jours pour limiter la consommation d'espace disque.
• Les rapports de scans de vulnérabilités et l'historique des sessions d'audit sont stockés dans la base SQLite locale pendant 90 jours avant d'être archivés de manière compressée ou purgés.

## 9.3 Gestion et Remédiation des Vulnérabilités

• Intégration de scripts NSE de nmap avec la base locale CVE pour détecter et qualifier instantanément la gravité des failles logicielles.
• Liaison dynamique avec les bases de correctifs officiels des distributions Linux pour suggérer les commandes apt de mise à jour exactes.

## 9.4 Protocoles d'Intégration Tiers (Banques, Hôpitaux)

• NetSentinel supporte l'exportation des logs d'audit au format standardisé Syslog RFC 5424 pour une intégration transparente avec les SIEM (Splunk, QRadar, ELK) utilisés dans les banques et hôpitaux.
• Export de rapports conformes aux standards de gouvernance et conformité PCI-DSS (transactions bancaires) et HIPAA (protection des données médicales).

## 9.5 Modèle de Planification PDDL d'Remédiation

Pour automatiser et optimiser l'enchaînement des actions de remédiation, NetSentinel utilise un planificateur PDDL (Planning Domain Definition Language). Voici la définition formelle du domaine contenant les actions d'isolement, d'alerte, de correctif (patch) et de basculement vers un système de sauvegarde (basculer) :
(define (domain netsentinel-remediation)
  (:requirements :strips :typing)
  (:types host threat)
  (:predicates
    (isolated ?h - host)
    (patched ?h - host)
    (compromised ?h - host)
    (threat-detected ?t - threat ?h - host)
    (alerted ?h - host)
    (backup-active ?h - host)
  )
  (:action isolate-system
    :parameters (?h - host)
    :precondition (compromised ?h)
    :effect (and (isolated ?h) (not (compromised ?h)))
  )
  (:action patch-system
    :parameters (?h - host)
    :precondition (and (isolated ?h) (not (patched ?h)))
    :effect (patched ?h)
  )
  (:action alert-admin
    :parameters (?h - host ?t - threat)
    :precondition (threat-detected ?t ?h)
    :effect (alerted ?h)
  )
  (:action switch-to-backup
    :parameters (?h - host)
    :precondition (isolated ?h)
    :effect (backup-active ?h)
  )
)

## 9.6 Architecture de SOC Agentique & Protocole MCP

• Agents IA de Triage Automatique : Déploiement d'agents autonomes de niveau 1 (L1) chargés d'analyser en continu le flux d'alertes réseau, de corréler les événements similaires et de filtrer les faux positifs pour réduire la fatigue d'alerte des analystes.
• Copilotes LLM pour Analystes : Génération automatique de résumés d'incidents complexes et de rapports d'audit de vulnérabilités rédigés de manière bilingue en Français et Kirundi, facilitant la communication technique et administrative.
• Orchestration multi-agents et Support MCP (Model Context Protocol) : Utilisation du protocole standard MCP pour maintenir un contexte partagé et synchronisé en temps réel entre les différents outils de détection (nmap, tshark), d'investigation (Gemini) et de réponse (PDDL/scripts d'isolement).

## 9.7 Gestion Continue de l'Exposition aux Menaces (CTEM)

• Cartographie Permanente des Actifs : Au-delà des audits nmap ponctuels, NetSentinel orchestre des scans passifs et actifs programmés pour maintenir à jour en continu l'inventaire des équipements connectés.
• Simulation d'Attaque Automatisée (Breach & Attack Simulation - BAS) : Modules intégrés de simulation d'attaques inoffensives (ex. requêtes ARP ou DNS suspectes) pour valider l'efficacité opérationnelle des honeypots locaux et de la détection de NetSentinel.
• Priorisation par l'Exploitabilité Réelle (EPSS) : Intégration du score EPSS (Exploit Prediction Scoring System) et du framework SSVC (Stakeholder Collaborative Vulnerability Categorization) dans la base SQLite locale. Les vulnérabilités découvertes sont priorisées selon leur exploitabilité active sur le web et leur impact local, et non plus sur le seul score CVSS brut.

# 10. Fonctionnalités Transverses

## 10.1 Assistant IA Intégré (Gemini API)

Un chatbot contextuel est accessible depuis chaque vue via un panneau flottant. Il a accès aux données du scan en cours pour répondre à des questions comme 'Quel est le risque principal de cet appareil ?' ou 'Comment exploiter cette CVE en lab ?'.

- Mode Explication : vulgarise les résultats techniques pour les apprenants
- Mode Expert : fournit des payloads, commandes et vecteurs d'attaque pour les pentesteurs
- Rédaction Rapport : génère automatiquement un résumé exécutif du pentest

## 10.2 Système de Rapports

- Export PDF : rapport complet avec logo, executive summary, findings, recommandations
- Export DOCX : format éditable pour personnalisation client
- Template personnalisable : logo, nom de l'entreprise, couleurs
- Scoring de risque automatique : calcul d'un Risk Score global basé sur les CVE et configurations

## 10.3 Gestion de Sessions & Historique

- Sauvegarde automatique de chaque session en SQLite avec timestamp
- Vue Historique : liste de toutes les sessions passées avec comparaison delta
- Export de session : partage des résultats entre collaborateurs (.netsent format JSON)

## 10.4 Interface & UX

- Thème : dark mode exclusif avec palette cybersécurité (bleu navy, rouge accent, vert teal)
- Responsive : s'adapte à différentes résolutions (1280x720 minimum)
- Notifications : système de toasts pour alertes réseau, progression des scans
- Raccourcis clavier : navigation rapide entre phases, lancement scan, export
- Aide contextuelle : tooltips et documentation inline à chaque étape

# 11. Équipe & Gouvernance

Cette section décrit le modèle opérationnel et la gouvernance globale du projet NetSentinel.

## 11.1 Organigramme du Projet

• Comité de Pilotage (COPIL) : Représentants ministériels, DSI et partenaires académiques. Valide les orientations stratégiques.
• Directeur de Projet : Gestion administrative, budget, liaison institutionnelle.
• Tech Lead & Architecte : Choix technologiques, validation de la sécurité et des performances de la plateforme.
• Équipe de Développement (Frontend React / Backend Node.js) : Implémentation de l'application et intégration des outils.
• Expert en Cybersécurité : Conception des playbooks d'incident, modélisation PDDL, tests d'intrusion de l'application.

## 11.2 Cartographie des Parties Prenantes

• Ministère de la Transition Numérique et des Postes (Burundi) : Commanditaire principal, assure le financement public et la validation politique.
• Banque de la République du Burundi (BRB) : Conseiller sur les exigences de conformité pour le secteur financier et bancaire.
• Universités Nationales (ex. Université du Burundi) : Partenaires d'intégration pour les programmes de formation académique en cybersécurité.
• Partenaires Internationaux (UIT, CERT régionaux) : Collaboration sur le partage de renseignements sur les menaces émergentes.

## 11.3 Fréquence de Reporting et Jalons

• Équipe Technique : Stand-up quotidiens et revues de sprint toutes les deux semaines (Agile Scrum).
• Comité de Pilotage : Réunion mensuelle avec rapport de progression (KPIs de roadmap et consomation budgétaire).
• Rapports trimestriels de sécurité remis à la DSI nationale pour validation de la conformité souveraine.

# 12. Budget Estimatif (Détaillé)

Cette section détaille le chiffrage financier requis pour le développement, le déploiement et la maintenance de NetSentinel.

## 12.1 Ventilation Budgétaire

Le budget total estimé de 3,2M USD est ventilé de la manière suivante :
• R&D et Personnel (Ingénieurs R&D, Tech Lead, Spécialiste Cyber, QA) : $1,800,000
• Infrastructure et Lab de Test (Achat de matériel réseau, serveurs de test) : $450,000
• Licences et Services Cloud (Services de calcul, abonnements APIs Gemini) : $250,000
• Déploiement et Formation (Ateliers pour les DSI ministérielles et universités) : $300,000
• Réserve de Contingence (15% pour faire face aux imprévus d'infrastructure) : $400,000

## 12.2 Sources de Financement

• Fonds de Transition Numérique de l'État : 50% ($1,600,000).
• Prêts et dons de développement multilatéraux (ex. Banque Mondiale) : 50% ($1,600,000).

## 12.3 Benchmark International & Justification du Coût

Alors que la création de centres CSIRT (Computer Security Incident Response Team) nationaux physiques se chiffre habituellement entre 10 et 50 millions de USD en raison des coûts d'infrastructure immobilière, de liaisons satellites dédiées et de matériel de calcul lourd, NetSentinel présente un budget extrêmement optimisé de 3,2 millions de USD. Ce coût modéré s'explique par le fait qu'il s'agit d'une plateforme logicielle d'orchestration légère conçue pour s'exécuter directement sur des postes de travail clients sous Ubuntu 24.04, éliminant ainsi les coûts de génie civil et d'infrastructure physique lourde.

# 13. Exigences Non Fonctionnelles

## 13.1 Performance

| Critère | Exigence |
| --- | --- |
| Démarrage application | < 3 secondes sur SSD standard |
| Affichage premier résultat scan | < 2 secondes après lancement du scan |
| Latence UI temps réel | Mise à jour des graphiques trafic < 500ms |
| Scan réseau /24 | < 30 secondes pour 254 hôtes (mode ping scan) |
| Fingerprinting | < 2 minutes par appareil (nmap -A complet) |

## 13.2 Compatibilité Système

| Critère | Spécification |
| --- | --- |
| OS cible | Ubuntu 24.04 LTS (Noble Numbat) — support primaire |
| OS secondaires | Ubuntu 22.04 LTS, Debian 12, Linux Mint 22 (non garanti) |
| Architecture | x86_64 uniquement (v1.0) |
| RAM minimale | 4 Go (8 Go recommandés pour capture trafic intensive) |
| Espace disque | 500 Mo application + espace variable pour captures pcap |
| Réseau | Interface ethernet ou Wi-Fi compatible mode promiscuous |
| Kernel | Linux >= 5.15 (pour eBPF optionnel) |

## 13.3 Sécurité de l'Application

- Aucune donnée envoyée vers des serveurs externes sauf API Gemini (opt-in)
- Clés API stockées dans le keyring système Ubuntu (libsecret)
- Chiffrement AES-256 de la base SQLite avec mot de passe utilisateur
- Sandbox Electron activé avec contextIsolation et nodeIntegration désactivé
- Validation et sanitization de toutes les entrées utilisateur avant construction de commandes système

# 14. Installation & Déploiement Ubuntu 24.04

## 14.1 Prérequis Système

- Node.js >= 22 LTS : installation via nvm ou NodeSource PPA
- nmap >= 7.94 : sudo apt install nmap
- tshark >= 4.2 : sudo apt install tshark (groupe wireshark)
- arp-scan : sudo apt install arp-scan
- mitmproxy >= 10.0 : installation via pipx
- Python >= 3.12 (pour mitmproxy et scripts auxiliaires)

## 14.2 Formats de Distribution

| Format | Usage & Avantages |
| --- | --- |
| .deb (Recommandé) | Installation native apt, gestion dépendances automatique, intégration menu Ubuntu |
| .AppImage | Portable, aucune installation requise, exécutable directement |
| .snap | Distribution via Snap Store, mises à jour automatiques, sandboxing |
| Source (GitHub) | Pour développeurs : clone + npm install + npm run build |

## 14.3 Gouvernance et Classification des Données

Le traitement de données potentiellement sensibles (bancaires, médicales, électorales) impose un cadre strict de gouvernance des données :
• Classification Niveau 1 — Public : Modèles d'invites IA génériques, signatures CVE publiques, versions génériques d'OS.
• Classification Niveau 2 — Confidentiel : Topologies de réseau local, adresses IP des machines du parc, rapports d'audit techniques générés.
• Classification Niveau 3 — Strictement Confidentiel : Identifiants de connexion interceptés (mots de passe en clair), données médicales ou bancaires capturées lors des analyses de trafic.
Séparation des Environnements : Les captures pcaps et les informations de niveau 3 sont stockées en mémoire volatile (tmpfs) et détruites à la fermeture de la session d'audit. Aucun stockage persistant de niveau 3 n'est effectué sans chiffrement fort AES-256 en base SQLite locale. Les environnements de test utilisent des données factices et isolées.

Hardening local et durcissement des agents IA : Les agents IA s'exécutent avec des comptes de service dédiés sans privilèges interactifs. Les clés cryptographiques d'accès aux APIs LLM sont chiffrées au repos via la clé de session et ne sont jamais journalisées ou affichées à l'écran. Des audits bi-annuels vérifient l'absence de dérive d'habilitation des agents.

## 14.4 Script d'Installation Automatique

Un script install.sh sera fourni pour configurer automatiquement tous les prérequis, les permissions (capabilities réseau), les groupes utilisateur (wireshark), et lancer l'application pour la première fois.

# 15. Roadmap, Recette, SLA & Approbations

## 15.1 Planning & Roadmap

| Milestone | Contenu & Durée estimée |
| --- | --- |
| M1 — Setup (Sem 1-2) | Scaffolding Electron+React+TypeScript, structure projet, CI/CD, thème dark |
| M2 — Phase 1 UI (Sem 3-4) | Network Map, cards appareils, intégration nmap -sn, parsing XML temps réel |
| M3 — Phase 2 UI (Sem 5-6) | Device Detail View, fingerprinting nmap -A, corrélation CVE, onglet IA |
| M4 — Phase 3 UI (Sem 7-8) | Traffic Dashboard, intégration tshark, graphes temps réel, alertes protocoles |
| M5 — Phase 4 UI (Sem 9-10) | Proxy Interceptor, mitmproxy WebSocket, éditeur requêtes, scanner IA |
| M6 — Transversal (Sem 11-12) | Système rapports PDF/DOCX, historique sessions, assistant IA chatbot |
| M7 — Polish & Release (Sem 13-14) | Tests E2E, optimisation perf, packaging .deb/.AppImage, documentation |

### 15.1.1 Feuille de Route Progressive et Paliers de Maturité (Burundi)

L'architecture de SOC agentique étant une technologie émergente en cours d'adoption (Technology Trigger du Gartner, 1-5% de pénétration de marché), et face à la pénurie locale d'ingénieurs cyber qualifiés, NetSentinel adopte un déploiement progressif en trois paliers :
• Palier 1 (Mois 1-12) — SOAR Classique & IA Assistée : L'IA agit exclusivement comme assistant (génération de rapports, copilote explicatif). Toute action réseau ou système doit être manuellement déclenchée par l'analyste.
• Palier 2 (Mois 13-24) — Automatisation Supervisée : Automatisation des alertes de faible criticité (ex. blocage iptables d'IP scannant agressivement, flush ARP) validée formellement par le moteur PDDL. Les incidents complexes requièrent toujours l'approbation humaine.
• Palier 3 (Mois 25-36) — Autonomie Agentique Encadrée : Activation de l'autonomie des agents IA pour le triage et l'investigation active, sous le contrôle formel des garde-fous PDDL et après montée en compétences des équipes locales.
• Modèle d'Appui Hybride (MSSP) : Pour sécuriser la phase transitoire de montée en compétences (Paliers 1 et 2), NetSentinel prévoit des passerelles d'intégration sécurisées permettant à un centre MSSP (Managed Security Service Provider) partenaire externe d'appuyer les équipes souveraines locales pour la validation d'incidents complexes de niveau 3.

## 15.2 Critères d'Acceptation & Plan de Recette (UAT)

La recette utilisateur (User Acceptance Testing) est articulée autour des critères de validation suivants :
• Détection : L'application doit identifier au moins 98% des hôtes actifs sur un segment LAN (/24) en moins de 30 secondes.
• Fiabilité : 100% des mots de passe transmis en clair (HTTP Basic, FTP) sur le réseau testé doivent être interceptés et affichés sans faux négatif.
• Convivialité : Zéro ligne de commande CLI requise pour exécuter un cycle complet d'audit (Découverte -> Fingerprint -> Analyse -> Proxy).
• Rapports : Les rapports PDF et DOCX générés doivent être complets, structurés et correspondre aux gabarits officiels de l'organisation.

## 15.3 Plan de Test et de Validation

Avant chaque mise en production, le pipeline DevSecOps de NetSentinel exécute automatiquement :
• Tests Unitaires (Vitest) : Couverture minimale requise de 80% du code source backend et frontend.
• Tests End-to-End (Playwright) : Scénarios complets simulant des scans de ports et des captures de paquets réseau dans des conteneurs isolés.
• Audit de Sécurité Automatique : Analyse statique de code (SAST via SonarQube) et vérification d'absence de vulnérabilités dans les dépendances NPM (npm audit).

## 15.4 Plan de Maintenance et SLA (Service Level Agreement)

La maintenance post-déploiement est structurée selon deux niveaux de support :
• Support Correctif Critique (SLA Niveau 1) : Correction de tout bug bloquant (ex. plantage du service de capture tshark) ou de faille de sécurité sous 24 heures.
• Support Évolutif (SLA Niveau 2) : Prise en charge des mises à jour système (compatibilité avec de nouvelles versions d'Ubuntu, nmap ou mitmproxy) sous 7 jours ouvrés.
• Support local assuré par l'équipe technique nationale à Bujumbura.

## 15.5 Modalités Contractuelles

• Propriété Intellectuelle : L'ensemble du code source, des livrables et de la documentation associée reste la propriété exclusive et souveraine de l'État burundais sous licence fermée.
• Pénalités de Retard : En cas de retard de livraison sur un jalon critique de la roadmap (Réf. Section 15.1), des pénalités forfaitaires de 0,5% du montant de la phase par semaine de retard seront appliquées.

## 15.6 Risques & Mitigations

| Risque | Mitigation |
| --- | --- |
| Permissions root complexes | Utiliser pkexec + setcap dès le setup, documenter précisément |
| Performance tshark en temps réel | Sampling des paquets, agrégation côté Main Process, rendu virtualisé React |
| Dépendances système manquantes | Script de vérification au démarrage avec guide d'installation automatique |
| API Gemini rate limiting | Cache des analyses IA, queue de requêtes, fallback mode offline |
| Compatibilité Wi-Fi mode monitor | Détecter les capacités de l'interface, afficher avertissement si non supporté |
| mitmproxy API instable | Tests sur version fixée, wrapper Python d'abstraction |
| Taille bundle Electron | Code splitting, lazy loading des phases, compression assets |

## 15.7 Glossaire

| Terme | Définition |
| --- | --- |
| SOTA | State-of-the-Art : désigne les outils les plus avancés et reconnus du domaine |
| Pentest | Penetration Testing : test d'intrusion autorisé pour identifier les vulnérabilités |
| Fingerprinting | Identification précise d'un système (OS, versions logicielles, services) |
| CVE | Common Vulnerabilities and Exposures : identifiant standardisé de vulnérabilités connues |
| CVSS | Common Vulnerability Scoring System : score de sévérité d'une vulnérabilité (0-10) |
| MitM | Man-in-the-Middle : attaque positionnant l'attaquant entre deux communicants |
| ARP Spoofing | Empoisonnement du cache ARP pour rediriger le trafic réseau |
| IPC | Inter-Process Communication : communication entre le main et renderer d'Electron |
| OUI | Organizationally Unique Identifier : 3 premiers octets d'une adresse MAC identifiant le fabricant |
| BPF | Berkeley Packet Filter : langage de filtrage de paquets réseau (utilisé par Wireshark/tshark) |
| NSE | Nmap Scripting Engine : système de scripts pour étendre les capacités de nmap |

# Annexes

## A. Dépendances NPM Principales

| Composant | Technologie | Rôle / Justification |
| --- | --- | --- |
| electron | ^30.0.0 | Framework desktop cross-platform |
| electron-vite | ^2.3.0 | Build tooling optimisé pour Electron |
| react | ^18.3.0 | Framework UI |
| typescript | ^5.5.0 | Typage statique |
| tailwindcss | ^3.4.0 | CSS utilitaire |
| @shadcn/ui | latest | Composants UI accessibles |
| d3 | ^7.9.0 | Visualisation graphes réseau |
| recharts | ^2.12.0 | Graphiques temps réel |
| framer-motion | ^11.3.0 | Animations UI |
| zustand | ^4.5.0 | State management |
| better-sqlite3 | ^11.0.0 | Base de données locale |
| execa | ^9.3.0 | Spawn processus système |
| xml2js | ^0.6.0 | Parsing XML nmap |
| @google/generative-ai | ^0.24.0 | Client API Gemini |

## B. Références & Documentation

- Nmap Reference Guide : https://nmap.org/book/
- tshark Manual : https://www.wireshark.org/docs/man-pages/tshark.html
- mitmproxy Docs : https://docs.mitmproxy.org/
- Electron Security : https://www.electronjs.org/docs/latest/tutorial/security
- NVD API v2.0 : https://nvd.nist.gov/developers/vulnerabilities
- OWASP Testing Guide v4.2 : https://owasp.org/www-project-web-security-testing-guide/
- Google Gemini API Docs : https://ai.google.dev/

— Fin du Cahier des Charges NetSentinel v1.0 —

## 15.8 Page de Validation et Signatures

Ce cahier des charges technique est validé et approuvé par les parties prenantes ci-dessous :
Document généré pour usage éducatif — Cybersécurité × Intelligence Artificielle

| Rôle | Nom & Titre | Signature | Date |
| --- | --- | --- | --- |
| Commanditaire / Sponsor | Représentant du Ministère des Postes et des TIC |  |  |
| Directeur de la SI | Directeur National de la Sécurité des Systèmes d'Information |  |  |
| Architecte Technique | Lead Architect NetSentinel |  |  |
