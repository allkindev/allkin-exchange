# Notes

Notes filed in folders, in a tab of Allkin. You write in the formatted document — headings,
lists, checkboxes, tables, images — without ever seeing a tag: Allkin's Markdown editor holds
the pen.

Each note is a `.md` file and each folder a real folder, in the shared folder
(`~/.allkin/share/notes/`). Your agents read and write the same notes: "file the minutes in my
notes, folder Meetings" works as it is.

## This integration needs the Markdown editor

The notepad does not edit text itself: it relies on the **Markdown editor** integration
(`markdown-editor`), a built-in integration of Allkin, always installed and allowed. Should it be
missing, the notepad shows a screen that leads to its page.

## Getting started

1. Install the integration, grant its right on its page and reload Allkin.
2. Open **Notes** in the list of integrations of the Allkin menu.
3. **Note** creates a note in the folder shown: type its title, then Enter to write.

## The screen

Two parts. On the left, **a column**: the pinned notes, then the tree of folders with their notes
under them (a folder unfolds with a click on its arrow or on its row), then the bin. On the
right, **the note**, which takes all the rest.

- The border of the column is dragged to change its width (double-click: the width by default);
  the ◫ button of the bar folds it — the note then takes the whole screen. Width and state are
  remembered.
- The bar says where you are: the path of the note's folder, each segment clickable, then the
  saving state. On the right: **Ask an agent**, the ⋯ menu of the note, **Note**.
- The small **+** of the "Notes" group creates a folder; the arrows next to it change the order of
  the notes (last modified, date created, title).
- On a phone, one part at a time: the column, then the note; the arrow of the bar goes back.

## Filing

- **Drag and drop** — a note or a folder lands on any folder of the tree. During the gesture, a
  "Notes" head of the column becomes the zone **"Drop here: out of its folder"**: dropping there
  takes the element out of its folder. A closed folder hovered for a moment opens. Dropping on
  the bin deletes.
- **Move to…** — in the menu of a note or a folder: a window shows the tree, "Not in a folder"
  first; the current place is greyed out and a folder is never offered inside itself.
- **Take out of its folder** — in the same menu, as soon as the element is in a folder: it goes
  back to the root in one click.
- After a move, the tree opens on the destination and the moved row lights up for a moment; a
  bubble confirms it.

Menus open with a right click, a long press on a touch screen, and the ⋯ button of the bar for
the open note.

## Ask an agent

The **Ask an agent** button of the bar (or the entry of the note's menu) opens a window: the
agent, what to send — the whole note or the selected passage — and your request. On sending, the
agent's conversation opens at the right of the note, which stays in sight; on a phone, it opens
in its own window. The agent offered is the last one used, and the request is remembered from
one time to the next.

## What else you can do

- **Title** — the title above the note is the name of its file: changing it renames the note.
- **Automatic saving** — the note is saved while you write; the state shows in the bar.
  Ctrl/⌘ + S saves at once; Ctrl/⌘ + ⇧ + L folds the column.
- **Pin** — a pinned note appears in the "Pinned" group, at the top of the column.
- **Search** — the field of the bar searches the titles and the text of every note; the results
  take the column (title, folder, excerpt), Escape clears them.
- **Duplicate, copy the text, download** the `.md` file — in the menu of the note.
- **Images and files** — drag them into the text or paste them: they are stored in
  `notes/_files/` and the note keeps them when it changes folder.
- **Bin** — deleting sends to the bin of the notepad; a click on "Bin" shows its content in place
  of the note, from where you **restore** to the original place. What you erase from this bin goes
  to the bin of the shared folder (Files page), where it stays until that one is emptied: nothing
  disappears by accident.
- **Counter** — words, characters and date modified, under the note.

## Where the notes are

| Place | Content |
|-------|---------|
| `share/notes/…/*.md` | the notes, in their folders |
| `share/notes/Trash/` | the bin of the notepad |
| `share/notes/_files/` | images and files dropped in the notes |
| `share/notes/.notes.json` | the pins, and where each element of the bin comes from |

A note changed by an agent while it is open is read again when you come back to the tab, as long
as you are not writing in it.

## Settings

None. The width of the column, its folded state, the sort order, the folded folders, the last
agent and the last request are remembered by the browser.

## Right requested

- **Allkin interface** — the integration runs in Allkin's page, with your session: it adds its tab and
  its entry in the list of integrations. It has neither service nor agent, and only writes in its folder
  of the shared folder. "Ask an agent" sends the message on your behalf, as if you had typed it in
  the conversation.

## For the other integrations

```js
Allkin.capability("notes").open();
const path = await Allkin.capability("notes").create({ title: "Idea", content: "# Idea\n", folder: "Projects" });
```

## If it does not work

- **"The Markdown editor is missing"** — the Markdown editor integration is not installed, or its right is
  not granted. The button of the screen opens its page; grant the right, then reload.
- **The tab does not show** — the "Interface" right of the notepad is not granted, or the page has
  not been reloaded since.
- **"Not saved"** — the write failed (disk full, session expired). The text stays on screen: log
  in again in another tab, then Ctrl/⌘ + S.
- **"… already exists here"** — the destination folder already holds a note or a folder of that
  name: rename one of the two before moving.
- **A note does not show** — only `.md` files are notes; names starting with a dot or an
  underscore are ignored.
