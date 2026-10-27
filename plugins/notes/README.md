# Bloc-notes

Des notes rangées par dossiers, dans un onglet d'Allkin. On écrit dans le document mis en forme —
titres, listes, cases à cocher, tableaux, images — sans jamais voir une balise : c'est l'éditeur
markdown d'Allkin qui tient la plume.

Chaque note est un fichier `.md`, chaque dossier un vrai dossier, dans le dossier partagé
(`~/.allkin/share/notes/`). Vos agents lisent et écrivent donc les mêmes notes : « rangez le
compte rendu dans mes notes, dossier Réunions » fonctionne tel quel.

## Cette intégration a besoin de l'éditeur markdown

Le bloc-notes n'édite pas le texte lui-même : il s'appuie sur l'intégration **Éditeur markdown**
(`markdown-editor`), une intégration de base d'Allkin, toujours installée et autorisée. Si elle venait à
manquer, le bloc-notes affiche un écran qui conduit à sa page.

## Commencer

1. Installez l'intégration, puis accordez-lui son droit sur sa page et rechargez Allkin.
2. Ouvrez **Bloc-notes** dans la liste des intégrations du menu Allkin.
3. **Note** crée une note dans le dossier affiché : tapez son titre, puis Entrée pour écrire.

## L'écran

Deux parties. À gauche, **une colonne** : les notes épinglées, puis l'arbre des dossiers avec leurs
notes dessous (un dossier se déplie d'un clic sur sa flèche ou sur sa ligne), puis la corbeille.
À droite, **la note**, qui prend tout le reste.

- La bordure de la colonne se tire pour changer sa largeur (double-clic : largeur de départ) ;
  le bouton ◫ de la barre la replie — la note occupe alors tout l'écran. Largeur et état sont
  retenus.
- La barre dit où vous êtes : le chemin du dossier de la note, chaque segment cliquable, puis
  l'état d'enregistrement. À droite : **Demander à un agent**, le menu ⋯ de la note, **Note**.
- Le petit **+** du groupe « Notes » crée un dossier ; les flèches à côté changent le tri des notes
  (dernière modification, date de création, titre).
- Sur un smartphone, une partie à la fois : la colonne, puis la note ; la flèche de la barre revient.

## Ranger

- **Glisser-déposer** — une note ou un dossier se dépose sur n'importe quel dossier de l'arbre.
  Pendant le geste, l'en-tête « Notes » de la colonne devient la zone **« Déposer ici : hors
  dossier »** : y déposer sort l'élément de son dossier. Un dossier fermé survolé un instant
  s'ouvre. Déposer sur la corbeille supprime.
- **Déplacer vers…** — dans le menu d'une note ou d'un dossier : une fenêtre montre l'arbre, « Hors
  dossier » en premier ; l'emplacement actuel est grisé et un dossier n'est jamais proposé dans
  lui-même.
- **Mettre hors dossier** — dans le même menu, dès que l'élément est dans un dossier : il remonte à
  la racine d'un clic.
- Après un déplacement, l'arbre s'ouvre sur la destination et la ligne déplacée s'allume un
  instant ; une bulle le confirme.

Les menus s'ouvrent au clic droit, à l'appui long sur un écran tactile, et par le bouton ⋯ de la
barre pour la note ouverte.

## Demander à un agent

Le bouton **Demander à un agent** de la barre (ou l'entrée du menu de la note) ouvre une fenêtre :
l'agent, ce que l'on envoie — la note entière ou le passage sélectionné —, et votre demande. À
l'envoi, la conversation de l'agent s'ouvre à droite de la note, qui reste sous vos yeux ; sur un
smartphone, elle s'ouvre dans sa propre fenêtre. L'agent proposé est le dernier utilisé, la
demande est retenue d'une fois sur l'autre.

## Ce que l'on peut faire d'autre

- **Titre** — le titre au-dessus de la note est le nom de son fichier : le changer renomme la note.
- **Enregistrement automatique** — la note s'enregistre pendant que vous écrivez ; l'état est
  affiché dans la barre. Ctrl/⌘ + S enregistre tout de suite ; Ctrl/⌘ + ⇧ + L replie la colonne.
- **Épingler** — une note épinglée apparaît dans le groupe « Épinglées », en tête de colonne.
- **Rechercher** — le champ de la barre cherche dans les titres et dans le texte de toutes les
  notes ; les résultats prennent la colonne (titre, dossier, extrait), Échap les efface.
- **Dupliquer, copier le texte, télécharger** le fichier `.md` — dans le menu de la note.
- **Images et fichiers** — glissez-les dans le texte ou collez-les : ils sont rangés dans
  `notes/_files/` et la note les garde quand elle change de dossier.
- **Corbeille** — supprimer envoie dans la corbeille du bloc-notes ; un clic sur « Corbeille »
  montre son contenu à la place de la note, d'où l'on **restaure** à l'emplacement d'origine. Ce
  que l'on efface de cette corbeille part dans celle du dossier partagé (page Fichiers), où il
  reste jusqu'à ce qu'elle soit vidée : rien ne disparaît par accident.
- **Compteur** — mots, caractères et date de modification, sous la note.

## Où sont les notes

| Emplacement | Contenu |
|-------------|---------|
| `share/notes/…/*.md` | les notes, dans leurs dossiers |
| `share/notes/Trash/` | la corbeille du bloc-notes |
| `share/notes/_files/` | images et fichiers déposés dans les notes |
| `share/notes/.notes.json` | les épingles, et l'origine des éléments de la corbeille |

Une note modifiée par un agent pendant qu'elle est ouverte est relue quand vous revenez sur
l'onglet, tant que vous n'êtes pas en train de l'écrire.

## Réglages

Aucun. La largeur de la colonne, son état replié, le tri, les dossiers repliés, le dernier agent
et la dernière demande sont retenus par le navigateur.

## Droit demandé

- **Interface d'Allkin** — l'intégration s'exécute dans la page d'Allkin, avec votre session : elle y
  ajoute son onglet et son entrée dans la liste des intégrations. Elle n'a ni service ni agent, et n'écrit
  que dans son dossier du dossier partagé. « Demander à un agent » envoie le message en votre nom,
  comme si vous l'aviez tapé dans la conversation.

## Pour les autres intégrations

```js
Allkin.capability("notes").open();
const path = await Allkin.capability("notes").create({ title: "Idée", content: "# Idée\n", folder: "Projets" });
```

## Si cela ne fonctionne pas

- **« L'éditeur markdown est absent »** — l'intégration Éditeur markdown n'est pas installée, ou son
  droit n'est pas accordé. Le bouton de l'écran ouvre sa page ; accordez le droit, puis rechargez.
- **L'onglet n'apparaît pas** — le droit « Interface » du bloc-notes n'est pas accordé, ou la page
  n'a pas été rechargée depuis.
- **« Non enregistrée »** — l'écriture a échoué (disque plein, session expirée). Le texte reste à
  l'écran : reconnectez-vous dans un autre onglet, puis Ctrl/⌘ + S.
- **« … existe déjà ici »** — le dossier de destination contient déjà une note ou un dossier du
  même nom : renommez l'un des deux avant de déplacer.
- **Une note n'apparaît pas** — seuls les fichiers `.md` sont des notes ; les noms commençant par
  un point ou un tiret bas sont ignorés.
