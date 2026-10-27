# Pont Telegram

Parlez à vos agents depuis Telegram. Un bot écoute en continu (long polling : rien à ouvrir sur
votre box, aucune adresse publique), relaie chaque message à l'agent de votre choix et renvoie sa
réponse dans le chat. Quand l'agent veut lancer une commande, elle arrive avec deux boutons :
**Autoriser** ou **Refuser**.

## Mise en route

1. Dans Telegram, écrivez à **@BotFather** : `/newbot`, un nom, un identifiant. Il vous donne le
   **jeton** du bot.
2. Collez le jeton dans les réglages de l'intégration, puis écrivez votre **identifiant Telegram** dans
   « Utilisateurs autorisés » (si vous ne le connaissez pas : enregistrez d'abord avec une liste
   vide de quelqu'un d'autre, écrivez au bot, il vous répond votre identifiant ; ou demandez-le à
   **@userinfobot**).
3. Choisissez l'**agent par défaut** (son identifiant, celui de l'URL de sa page).
4. Accordez les trois droits, cochez **Autoriser le démarrage en service**, enregistrez.

Écrivez au bot : `/start` explique les commandes, le reste part à l'agent.

## Dans le chat

| Commande      | Effet                                                        |
|---------------|--------------------------------------------------------------|
| `/agents`     | la liste des agents, avec la commande pour passer à chacun   |
| `/agent <id>` | ce chat parle désormais à cet agent (nouvelle conversation)  |
| `/new`        | repart sur une conversation vierge avec le même agent        |
| `/who`        | l'agent et la conversation de ce chat                        |

Chaque chat Telegram garde sa conversation : elle survit aux redémarrages de l'intégration et
d'Allkin, et se retrouve dans l'historique de l'agent, dans l'interface. Une photo ou un fichier
envoyé au bot est déposé dans le dossier **Upload** de l'agent, qui en est informé.

## Ce qu'il faut savoir

- **Seuls les identifiants listés** peuvent parler au bot ; les autres reçoivent un refus avec
  leur identifiant, pour que vous puissiez l'ajouter.
- Les **formulaires** qu'un agent peut demander ne se remplissent pas depuis Telegram : ils
  sont annulés avec un mot d'explication.
- Les validations de commandes depuis Telegram peuvent être coupées dans les réglages : les
  commandes sont alors refusées d'office.
- L'intégration ne parle qu'à `api.telegram.org`, sauf si vous pointez un serveur Bot API à vous.

## Droits

| Droit      | Pourquoi                                                                 |
|------------|--------------------------------------------------------------------------|
| Réseau     | interroger Telegram et y renvoyer les réponses, télécharger les fichiers |
| Agents     | ouvrir une conversation avec un agent par la socket d'Allkin             |
| Fichiers   | déposer les fichiers reçus dans le dossier Upload de l'agent             |
