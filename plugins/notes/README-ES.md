# Bloc de notas

Notas ordenadas en carpetas, en una pestaña de Allkin. Se escribe en el documento con formato —
títulos, listas, casillas, tablas, imágenes — sin ver nunca una etiqueta: el editor Markdown de
Allkin lleva la pluma.

Cada nota es un archivo `.md` y cada carpeta una carpeta de verdad, en la carpeta compartida
(`~/.allkin/share/notes/`). Tus agentes leen y escriben las mismas notas: «guarda el acta en mis
notas, carpeta Reuniones» funciona tal cual.

## Esta integración necesita el editor Markdown

El bloc de notas no edita el texto por sí mismo: se apoya en la integración **Editor Markdown**
(`markdown-editor`), una integración básica de Allkin, siempre instalada y autorizada. Si
llegara a faltar, el bloc de notas muestra una pantalla que lleva a su página.

## Empezar

1. Instala la integración, concédele su permiso en su página y recarga Allkin.
2. Abre **Bloc de notas** en la lista de integraciones del menú Allkin.
3. **Nota** crea una nota en la carpeta mostrada: escribe su título y pulsa Intro para escribir.

## La pantalla

Dos partes. A la izquierda, **una columna**: las notas fijadas, luego el árbol de carpetas con sus
notas debajo (una carpeta se despliega con un clic en su flecha o en su línea), luego la papelera.
A la derecha, **la nota**, que ocupa todo lo demás.

- El borde de la columna se arrastra para cambiar su ancho (doble clic: ancho inicial); el botón ◫
  de la barra la pliega — la nota ocupa entonces toda la pantalla. Ancho y estado se recuerdan.
- La barra dice dónde estás: la ruta de la carpeta de la nota, cada segmento clicable, y el estado
  de guardado. A la derecha: **Preguntar a un agente**, el menú ⋯ de la nota, **Nota**.
- El pequeño **+** del grupo «Notas» crea una carpeta; las flechas de al lado cambian el orden de
  las notas (última modificación, fecha de creación, título).
- En un teléfono, una parte a la vez: la columna, luego la nota; la flecha de la barra vuelve.

## Ordenar

- **Arrastrar y soltar** — una nota o una carpeta se suelta sobre cualquier carpeta del árbol.
  Durante el gesto, la cabecera «Notas» de la columna se convierte en la zona **«Suelta aquí:
  fuera de su carpeta»**: soltar ahí saca el elemento de su carpeta. Una carpeta cerrada
  sobrevolada un instante se abre. Soltar sobre la papelera elimina.
- **Mover a…** — en el menú de una nota o de una carpeta: una ventana muestra el árbol, «Sin
  carpeta» primero; el lugar actual aparece en gris y una carpeta nunca se propone dentro de sí
  misma.
- **Sacar de su carpeta** — en el mismo menú, en cuanto el elemento está en una carpeta: vuelve a
  la raíz con un clic.
- Tras un movimiento, el árbol se abre en el destino y la línea movida se ilumina un instante; una
  burbuja lo confirma.

Los menús se abren con el clic derecho, con una pulsación larga en una pantalla táctil, y con el
botón ⋯ de la barra para la nota abierta.

## Preguntar a un agente

El botón **Preguntar a un agente** de la barra (o la entrada del menú de la nota) abre una
ventana: el agente, qué enviar — la nota entera o el pasaje seleccionado — y tu petición. Al
enviar, la conversación del agente se abre a la derecha de la nota, que sigue a la vista; en un
teléfono, se abre en su propia ventana. El agente propuesto es el último usado, y la petición se
recuerda de una vez a otra.

## Qué más se puede hacer

- **Título** — el título encima de la nota es el nombre de su archivo: cambiarlo renombra la nota.
- **Guardado automático** — la nota se guarda mientras escribes; el estado se ve en la barra.
  Ctrl/⌘ + S guarda al instante; Ctrl/⌘ + ⇧ + L pliega la columna.
- **Fijar** — una nota fijada aparece en el grupo «Fijadas», en lo alto de la columna.
- **Buscar** — el campo de la barra busca en los títulos y en el texto de todas las notas; los
  resultados ocupan la columna (título, carpeta, extracto), Esc los borra.
- **Duplicar, copiar el texto, descargar** el archivo `.md` — en el menú de la nota.
- **Imágenes y archivos** — arrástralos al texto o pégalos: se guardan en `notes/_files/` y la nota
  los conserva cuando cambia de carpeta.
- **Papelera** — eliminar envía a la papelera del bloc de notas; un clic en «Papelera» muestra su
  contenido en lugar de la nota, desde donde se **restaura** en el lugar de origen. Lo que se borra
  de esta papelera va a la de la carpeta compartida (página Archivos), donde permanece hasta que se
  vacíe: nada desaparece por accidente.
- **Contador** — palabras, caracteres y fecha de modificación, bajo la nota.

## Dónde están las notas

| Lugar | Contenido |
|-------|-----------|
| `share/notes/…/*.md` | las notas, en sus carpetas |
| `share/notes/Trash/` | la papelera del bloc de notas |
| `share/notes/_files/` | imágenes y archivos depositados en las notas |
| `share/notes/.notes.json` | las notas fijadas y el origen de los elementos de la papelera |

Una nota modificada por un agente mientras está abierta se vuelve a leer cuando regresas a la
pestaña, siempre que no la estés escribiendo.

## Ajustes

Ninguno. El ancho de la columna, su estado plegado, el orden, las carpetas plegadas, el último
agente y la última petición los recuerda el navegador.

## Permiso solicitado

- **Interfaz de Allkin** — la integración se ejecuta en la página de Allkin, con tu sesión: añade
  su pestaña y su entrada en la lista de integraciones. No tiene servicio ni agente, y solo escribe
  en su carpeta de la carpeta compartida. «Preguntar a un agente» envía el mensaje en tu nombre,
  como si lo hubieras escrito en la conversación.

## Para las otras integraciones

```js
Allkin.capability("notes").open();
const path = await Allkin.capability("notes").create({ title: "Idea", content: "# Idea\n", folder: "Proyectos" });
```

## Si no funciona

- **«Falta el editor Markdown»** — la integración Editor Markdown no está instalada, o su permiso no
  está concedido. El botón de la pantalla abre su página; concede el permiso y recarga.
- **La pestaña no aparece** — el permiso «Interfaz» del bloc de notas no está concedido, o la página
  no se ha recargado desde entonces.
- **«No guardada»** — la escritura falló (disco lleno, sesión caducada). El texto sigue en pantalla:
  vuelve a iniciar sesión en otra pestaña y pulsa Ctrl/⌘ + S.
- **«… ya existe aquí»** — la carpeta de destino ya contiene una nota o una carpeta con ese nombre:
  renombra una de las dos antes de mover.
- **Una nota no aparece** — solo los archivos `.md` son notas; los nombres que empiezan por un punto
  o un guion bajo se ignoran.
