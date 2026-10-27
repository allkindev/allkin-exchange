# Agents

One folder per agent, named after its id: what an export of an agent holds, unzipped.

```
agents/<id>/
├── agent.json          the card: name, version (1.0.N), description, author, locales
├── CLAUDE.md           the role — the real content of the agent
├── README.md           for the user, with README-FR.md, README-ES.md, README-DE.md
├── memory.json         optional: the facts it starts with
├── dependencies.json   optional: the competences and services it uses
└── avatar.webp         optional: its picture (png and jpg accepted)
```

An Allkin installs an agent through the identity card of an import: the user reads what it is,
what it asks for and what it depends on, may have it verified, then imports it. **An archive
grants nothing**: whatever the card says, the agent arrives without any right.
