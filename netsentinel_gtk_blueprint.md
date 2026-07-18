# Cahier des Charges Fonctionnel & Technique : NetSentinel (Version Native GNOME/GTK4)

Ce document sert de spécifications techniques et fonctionnelles (Cahier des Charges) pour la conception et l'implémentation de la plateforme **NetSentinel** sous forme d'application de bureau Linux native pour Ubuntu (GNOME/GTK4).

---

## 1. Objectifs Généraux & Stack Technologique

L'application doit s'intégrer harmonieusement à l'environnement de bureau par défaut d'Ubuntu.

### Stack Technologique Imposée
* **Interface Utilisateur (UI)** : Python (avec les liaisons PyGObject) ou JavaScript / GJS, associé à **GTK4** et à la bibliothèque **Libadwaita** (`Adw`). Les fichiers de disposition d'interface doivent être décrits en Blueprint markup ou en XML (GtkBuilder).
* **Logique Applicative (Backend)** : Python 3.12+ (développement rapide) ou Vala/C (performances).
* **Intégration OS** :
  - Support natif des thèmes clairs/sombres GNOME (`Adw.StyleManager`).
  - Utilisation des notifications système de bureau.
  - Performance optimisée (faible empreinte RAM/CPU).
* **Persistance des Données** : Base de données locale **SQLite** (mode WAL activé).
* **Interactions avec les Utilitaires Réseau** : Exécution asynchrone et non-bloquante de binaires système via les API système d'asyncio ou de threads GLib.

---

## 2. Spécifications Ergonomiques (UI/UX) - L'approche Native Ubuntu

L'application doit respecter scrupuleusement les GNOME Human Interface Guidelines (HIG) :
* **Mise en page adaptative** : Utilisation d'un panneau latéral escamotable via `Adw.NavigationSplitView` ou un composant similaire.
* **Barre d'outils supérieure** : Utilisation de `Adw.HeaderBar` pour regrouper les contrôles de fenêtre, le titre de l'application et les boutons contextuels.
* **Notifications et Retours** : Utilisation de `Adw.ToastOverlay` pour les messages temporaires, et de `Adw.StatusPage` pour les états vides ou initiaux.

---

## 3. Spécifications Fonctionnelles Détaillées (Les Modules)

L'application doit implémenter 8 vues distinctes accessibles depuis la barre de navigation latérale :

### A. Network Map (Cartographie Réseau)
* **Objectif** : Visualisation topologique et dynamique du réseau local.
* **Fonctionnalités** :
  - Zone de dessin interactive (rendue via un `Gtk.DrawingArea` ou équivalent) représentant les équipements découverts (nœuds) et leurs liaisons (arêtes).
  - Identification visuelle des statuts (en ligne, hors ligne, vulnérable).
  - Sélection d'un nœud pour afficher ses détails (IP, MAC, type, OS) dans un panneau contextuel.

### B. Fingerprint, CTEM & PQC Audit (Empreinte & Audits Actifs)
* **Objectif** : Analyse approfondie des ports, vulnérabilités et sécurité cryptographique.
* **Fonctionnalités** :
  - **Scan actif** : Lancement d'audits Nmap configurables (modes rapide, normal, agressif, ou IA profond).
  - **Audit de Cryptographie Post-Quantique (PQC)** : Vérification de la vulnérabilité des ports chiffrés (SSH, HTTPS) face à la menace de décryptage futur (HNDL). Indiquer la conformité avec les algorithmes post-quantiques (ex. ML-KEM).
  - **Audits Actifs de Sécurité (CTEM / BAS)** : Boutons d'action pour exécuter et consigner des tests de sécurité (Test d'interception ARP, Balayage Port Scan, Validation de correctifs cryptographiques) dans les journaux d'audit.

### C. Traffic Capture (Écoute Réseau)
* **Objectif** : Analyse passive et en temps réel du trafic réseau.
* **Fonctionnalités** :
  - Lancement et arrêt d'une écoute réseau (sniffing) sur une interface sélectionnée.
  - Grille de paquets mise à jour en temps réel (Temps, Source, Destination, Protocole, Taille, Infos).
  - Filtre BPF textuel pour restreindre le trafic capturé.
  - Extraction passive de clés/identifiants en clair (protocoles non chiffrés) présentés dans un volet latéral dédié.

### D. Web Interceptor Proxy (Proxy MitM & Rejeu)
* **Objectif** : Intercepter et rejouer le trafic HTTP/HTTPS de l'hôte.
* **Fonctionnalités** :
  - Démarrage d'un serveur proxy interceptant le trafic web local.
  - Flux de requêtes en temps réel avec inspection détaillée des en-têtes (Headers) et du corps (Body) des requêtes et réponses HTTP.
  - Module de rejeu (Request Replay) permettant de modifier une requête interceptée (méthode, URL, headers, body) et de l'exécuter pour analyser la réponse du serveur.

### E. Active Enumeration (Énumération Active)
* **Objectif** : Effectuer des audits actifs sur une cible Web ou DNS.
* **Fonctionnalités** :
  - **Audit de répertoires Web (Directory Buster)** : Parcourir une liste de chemins sensibles (wordlist) sur une URL cible pour remonter les codes d'état HTTP découverts (200, 301, 403, 500) et la taille de réponse.
  - **Audit DNS & Sous-domaines** : Résolution des enregistrements DNS (A, AAAA, MX, NS, TXT) du domaine cible et bruteforce de sous-domaines courants.
  - Contrôles d'exécution (Lancement/Arrêt) et barres de progression dynamiques pour chaque outil.

### F. History (Historique des Sessions)
* **Objectif** : Organiser les audits de sécurité par sessions.
* **Fonctionnalités** :
  - Création de sessions de test avec titre, description et cible.
  - Grille des sessions existantes avec résumé du nombre d'équipements découverts, de vulnérabilités et du score de risque calculé.
  - Sélection de la session active qui filtre l'affichage global des données de l'application.

### G. Reports (Générateur de Rapports)
* **Objectif** : Consolider les résultats d'audit pour les décideurs.
* **Fonctionnalités** :
  - Génération de rapports d'audit complets compilant les vulnérabilités trouvées, la topologie et les conclusions de sécurité.
  - Exportation au format PDF.

### H. Settings (Configuration Générale)
* **Objectif** : Gérer l'environnement d'exécution.
* **Fonctionnalités** :
  - Sélection de l'interface réseau active pour l'écoute du trafic et les scans.
  - Configuration de la clé d'API (ex: Gemini API pour les explications contextuelles de l'IA).

---

## 4. Spécifications Non-Fonctionnelles : Garde-fous Logiques & SOC Agentique

### Validation PDDL (Planning Domain Definition Language)
* L'application doit implémenter un moteur de validation logique. Avant qu'une action automatisée ou proposée par un agent (ex: isoler un hôte du réseau ou patcher un service) ne soit exécutée, le système doit formellement vérifier les préconditions logiques :
  - **Règle d'isolement** : L'isolement réseau d'un hôte est bloqué si l'IP cible correspond à la passerelle par défaut (Gateway IP), afin de préserver la connectivité du réseau.
  - **Règle de patch** : La mise à niveau à chaud de services critiques sur la passerelle est bloquée à moins qu'un basculement préalable (failover) vers un commutateur de secours n'ait été validé.
* Chaque plan proposé par l'IA doit être traduit en buts PDDL, vérifié par le validateur et consigné dans les logs.

### Journalisation d'Audit des Agents IA
* Chaque décision prise par le triage IA (Agent de niveau L1) ou l'action de remédiation (Agent de niveau L2) doit être documentée de manière immuable dans SQLite :
  - Horodatage précis.
  - Identifiant de l'agent.
  - Commande d'action initiée.
  - Entrées fournies et sorties générées.
  - Statut de validation PDDL (Validé / Bloqué) et règle violée le cas échéant.

---

## 5. Spécifications Techniques & Exécution des Utilitaires

L'implémentation doit reposer sur l'orchestration des outils système Linux suivants :
1. **Host Discovery** : Intégration asynchrone d'utilitaires locaux comme `arp-scan` et `nmap` pour remonter les IP/MAC/Hôtes.
2. **Packet Capture** : Spawner le démon `tshark` en tâche de fond avec tamponnage de ligne (`-l`) et format d'échange JSON (`-T ek`), lire le flux sortant et le fermer proprement à l'arrêt.
3. **HTTP Proxy** : Piloter `mitmdump` en lui passant un script d'extension Python personnalisé pour intercepter, formater et retransmettre les événements HTTP vers la base SQLite locale.
4. **Active Enumeration** : Gérer les requêtes réseau via les mécanismes de sockets système et les clients HTTP natifs, cadencés par une temporisation fine pour éviter le déni de service de l'hôte testé.

---

Dites-moi "Prêt" pour que je commence à rédiger le code d'implémentation de cette structure native GNOME/GTK4 !
