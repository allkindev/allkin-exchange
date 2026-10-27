# Notizen

Notizen in Ordnern, in einem Tab von Allkin. Geschrieben wird im formatierten Dokument —
Überschriften, Listen, Kontrollkästchen, Tabellen, Bilder — ohne je ein Tag zu sehen: der
Markdown-Editor von Allkin führt die Feder.

Jede Notiz ist eine `.md`-Datei und jeder Ordner ein echter Ordner, im gemeinsamen Ordner
(`~/.allkin/share/notes/`). Deine Agenten lesen und schreiben also dieselben Notizen: „lege das
Protokoll in meinen Notizen ab, Ordner Besprechungen“ funktioniert so, wie es ist.

## Diese Integration braucht den Markdown-Editor

Der Notizblock bearbeitet den Text nicht selbst: er stützt sich auf die Integration **Markdown-Editor**
(`markdown-editor`), eine Basis-Integration von Allkin, immer installiert und erlaubt. Sollte sie
fehlen, zeigt der Notizblock eine Seite, die zu seiner Seite führt.

## Loslegen

1. Installiere die Integration, gewähre ihr ihr Recht auf ihrer Seite und lade Allkin neu.
2. Öffne **Notizen** in der Integrationsliste des Allkin-Menüs.
3. **Notiz** erstellt eine Notiz im angezeigten Ordner: Titel tippen, dann Eingabe zum Schreiben.

## Der Bildschirm

Zwei Teile. Links **eine Spalte**: die angehefteten Notizen, dann der Baum der Ordner mit ihren
Notizen darunter (ein Ordner klappt mit einem Klick auf seinen Pfeil oder seine Zeile auf), dann
der Papierkorb. Rechts **die Notiz**, die den ganzen Rest einnimmt.

- Der Rand der Spalte lässt sich ziehen, um ihre Breite zu ändern (Doppelklick: Ausgangsbreite);
  der Knopf ◫ der Leiste klappt sie ein — die Notiz nimmt dann den ganzen Bildschirm ein. Breite
  und Zustand werden gemerkt.
- Die Leiste sagt, wo du bist: der Pfad des Ordners der Notiz, jedes Stück anklickbar, dann der
  Speicherzustand. Rechts: **Einen Agenten fragen**, das Menü ⋯ der Notiz, **Notiz**.
- Das kleine **+** der Gruppe „Notizen“ erstellt einen Ordner; die Pfeile daneben ändern die
  Reihenfolge der Notizen (zuletzt geändert, Erstellungsdatum, Titel).
- Auf einem Telefon ein Teil nach dem anderen: die Spalte, dann die Notiz; der Pfeil der Leiste
  führt zurück.

## Ablegen

- **Ziehen und Ablegen** — eine Notiz oder ein Ordner landet auf jedem beliebigen Ordner des
  Baums. Während der Geste wird der Kopf „Notizen“ der Spalte zur Zone **„Hier ablegen: aus dem
  Ordner heraus“**: dort ablegen nimmt das Element aus seinem Ordner. Ein geschlossener Ordner,
  kurz überfahren, öffnet sich. Auf dem Papierkorb ablegen löscht.
- **Verschieben nach…** — im Menü einer Notiz oder eines Ordners: ein Fenster zeigt den Baum,
  „Ohne Ordner“ zuerst; der aktuelle Ort ist ausgegraut und ein Ordner wird nie in sich selbst
  angeboten.
- **Aus dem Ordner herausnehmen** — im selben Menü, sobald das Element in einem Ordner liegt: es
  kehrt mit einem Klick zur Wurzel zurück.
- Nach einem Verschieben öffnet sich der Baum am Ziel und die verschobene Zeile leuchtet kurz auf;
  eine Meldung bestätigt es.

Menüs öffnen sich mit Rechtsklick, mit langem Drücken auf einem Touchscreen und über den Knopf ⋯
der Leiste für die geöffnete Notiz.

## Einen Agenten fragen

Der Knopf **Einen Agenten fragen** der Leiste (oder der Eintrag im Menü der Notiz) öffnet ein
Fenster: der Agent, was gesendet wird — die ganze Notiz oder die markierte Stelle — und deine
Bitte. Beim Senden öffnet sich die Unterhaltung des Agenten rechts neben der Notiz, die im Blick
bleibt; auf einem Telefon öffnet sie sich in einem eigenen Fenster. Vorgeschlagen wird der zuletzt
benutzte Agent, und die Bitte wird von Mal zu Mal gemerkt.

## Was man sonst noch tun kann

- **Titel** — der Titel über der Notiz ist der Name ihrer Datei: ihn ändern benennt die Notiz um.
- **Automatisches Speichern** — die Notiz wird beim Schreiben gespeichert; der Zustand steht in
  der Leiste. Strg/⌘ + S speichert sofort; Strg/⌘ + ⇧ + L klappt die Spalte ein.
- **Anheften** — eine angeheftete Notiz erscheint in der Gruppe „Angeheftet“ oben in der Spalte.
- **Suchen** — das Feld der Leiste durchsucht die Titel und den Text aller Notizen; die Treffer
  nehmen die Spalte ein (Titel, Ordner, Auszug), Esc löscht sie.
- **Duplizieren, Text kopieren, herunterladen** der `.md`-Datei — im Menü der Notiz.
- **Bilder und Dateien** — in den Text ziehen oder einfügen: sie werden in `notes/_files/`
  abgelegt und die Notiz behält sie, wenn sie den Ordner wechselt.
- **Papierkorb** — Löschen schickt in den Papierkorb des Notizblocks; ein Klick auf „Papierkorb“
  zeigt seinen Inhalt anstelle der Notiz, von wo man an den Ursprungsort **wiederherstellt**. Was
  man aus diesem Papierkorb entfernt, wandert in den des gemeinsamen Ordners (Seite Dateien) und
  bleibt dort, bis dieser geleert wird: nichts verschwindet aus Versehen.
- **Zähler** — Wörter, Zeichen und Änderungsdatum, unter der Notiz.

## Wo die Notizen liegen

| Ort | Inhalt |
|-----|--------|
| `share/notes/…/*.md` | die Notizen, in ihren Ordnern |
| `share/notes/Trash/` | der Papierkorb des Notizblocks |
| `share/notes/_files/` | in den Notizen abgelegte Bilder und Dateien |
| `share/notes/.notes.json` | die angehefteten Notizen und die Herkunft der Elemente im Papierkorb |

Eine Notiz, die ein Agent ändert, während sie offen ist, wird beim Zurückkehren zum Tab neu
gelesen, solange du nicht gerade darin schreibst.

## Einstellungen

Keine. Die Breite der Spalte, ihr eingeklappter Zustand, die Sortierung, die eingeklappten
Ordner, der letzte Agent und die letzte Bitte werden vom Browser gemerkt.

## Angefordertes Recht

- **Oberfläche von Allkin** — die Integration läuft in der Seite von Allkin, mit deiner Sitzung: sie fügt
  ihren Tab und ihren Eintrag in der Integrationsliste hinzu. Sie hat weder Dienst noch Agent und
  schreibt nur in ihren Ordner des gemeinsamen Ordners. „Einen Agenten fragen“ sendet die
  Nachricht in deinem Namen, als hättest du sie in der Unterhaltung getippt.

## Für die anderen Integrationen

```js
Allkin.capability("notes").open();
const path = await Allkin.capability("notes").create({ title: "Idee", content: "# Idee\n", folder: "Projekte" });
```

## Wenn es nicht funktioniert

- **„Der Markdown-Editor fehlt“** — die Integration Markdown-Editor ist nicht installiert oder ihr Recht
  nicht gewährt. Der Knopf auf dem Bildschirm öffnet seine Seite; gewähre das Recht und lade neu.
- **Der Tab erscheint nicht** — das Recht „Oberfläche“ des Notizblocks ist nicht gewährt, oder die
  Seite wurde seitdem nicht neu geladen.
- **„Nicht gespeichert“** — das Schreiben ist fehlgeschlagen (Platte voll, Sitzung abgelaufen). Der
  Text bleibt auf dem Bildschirm: melde dich in einem anderen Tab neu an, dann Strg/⌘ + S.
- **„… gibt es hier bereits“** — der Zielordner enthält schon eine Notiz oder einen Ordner dieses
  Namens: benenne eines der beiden um, bevor du verschiebst.
- **Eine Notiz erscheint nicht** — nur `.md`-Dateien sind Notizen; Namen, die mit einem Punkt oder
  einem Unterstrich beginnen, werden übergangen.
