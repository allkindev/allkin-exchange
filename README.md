# Allkin Exchange

What [Allkin](https://github.com/allkindev/allkin) and its members publish, for every subscriber:
**integrations**, **competences** and **agents**. An Allkin reads this repository as raw files,
through one signed `catalogue.json`, and shows it on its **Exchange** page.

| Folder | For the user | What it holds |
|---|---|---|
| `plugins/<id>/` | an **integration** | a `plugin.json` manifest, the code, `README.md` and its translations |
| `skills/<id>/` | a **competence** | a standard `SKILL.md`, Allkin's `skill.json`, `README.md` and its translations |
| `agents/<id>/` | an **agent** | what an export of an agent holds, unzipped: `agent.json`, `CLAUDE.md`, `README.md`… |

The code keeps the names of before (`plugins/`, `skills/`); the user reads integrations and
competences. There is no channel and no validation file any more (2026-10-27): what is here was
published by the supervisor of the Allkin site, and nothing reaches the repository another way.

## How something gets here

1. A member of the Allkin site uploads an integration, a competence or an agent from their
   member area — at most one update a day per publication.
2. The supervisor reads it and decides. On yes, the site writes the files here, regenerates and
   signs the catalogue, and pushes.
3. Every subscribed Allkin sees it on its Exchange page at the next refresh, and offers the
   update to those who installed an earlier version.

An Allkin whose subscription ended keeps what it installed, but gets no update any more.

## Versions: `1.0.N`

Every entry carries a version of the form `1.0.N`: three numbers, the first two fixed, `N` an
integer without a leading zero. **Every change** to an entry (code, manifest, README, icon) raises
`N` by one, in the same change — Allkin offers an update only when the catalogue is ahead of the
installed version, and compares number by number (`1.0008` would read as `1.8`).

## The catalogue

```
node scripts/catalogue.mjs          # checks every entry, writes catalogue.json and signs it
node scripts/catalogue.mjs --check  # checks without writing (exit 1 on a difference)
```

The catalogue lists every file of every entry with its size and SHA-256 digest: an Allkin refuses
to install an entry whose files do not match. It is signed with the owner's Ed25519 key
(`~/.allkin-signing/catalogue.key`, never in the repository); Allkin carries the public half and
reads nothing from an Exchange whose signature is missing or wrong. `catalogue.json` and
`catalogue.json.sig` are always committed together.

## Writing one

- An **integration**: [CREER-UN-PLUGIN.md](CREER-UN-PLUGIN.md) (in French) — a complete example,
  the manifest, the rights, the service, the interface, local testing.
- A **competence**: a folder with `SKILL.md` (header `name` / `description`, `name` being the
  folder name, then the procedure), `skill.json` (`version`, `author`, `icon`, `category`, the
  `locales`), `README.md` plus `README-FR.md`, `README-ES.md`, `README-DE.md`. `allowed-tools`
  is ignored: a competence never widens an agent's rights.
- An **agent**: export it from its Agent page in Allkin and unzip the `.allkin` archive into
  `agents/<id>/`, with a `README.md`. Whatever `agent.json` asks, an imported agent gets no
  right: the user grants them from its settings.

Every text shown to the user exists in the four languages of Allkin (en, fr, es, de).
