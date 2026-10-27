"use strict";
/* ============================================================================
   Notes plugin.
   ----------------------------------------------------------------------------
   A notepad in a tab of Allkin (kind "notes"): one column at the left — the
   pinned notes, the tree of folders with their notes, the bin — and the note
   being written at the right. The column folds and its width is dragged; on
   a phone, one part at a time.

   A note is a Markdown file, a folder is a folder: everything lives in the
   plugin's folder of the shared folder (share/notes/), so the agents read and
   write the same notes. Beside them:
     · Trash/       the bin of the notepad: deleting moves there, restoring
                    moves back; what is erased from it goes to the bin of the
                    shared folder;
     · _files/      the images and files dropped in the notes;
     · .notes.json  what a file cannot say: the pinned notes, and where each
                    element of the bin comes from.

   The document itself is written in the Markdown editor (capability
   "markdown-editor", plugin `markdown-editor`, required by the manifest):
   nothing here edits text.

   "Ask an agent" sends the note (or the selected passage) to an agent's
   conversation, which opens beside the note (core.sendToAgent, core.openSplit).

   For the other plugins:
     Allkin.capability("notes").open()
     Allkin.capability("notes").create({ title, content, folder }) -> path
   ========================================================================== */
(() => {
const Allkin = window.Allkin;
const core = Allkin.core;
const { el, share } = core;
const t = Allkin.t;
const tn = Allkin.tn;

const KIND = "notes";
/** The plugin's folder in the shared folder. */
const ROOT = share.pluginFolder("notes");
const TRASH = "Trash";
const FILES = "_files";
const META = ".notes.json";
/** The place shown instead of a note. */
const BIN = "*trash";
const STORE_KEY = "allkin.plugin.notes";
const SAVE_DELAY = 700;
const MAX_DEPTH = 8;
const NOTE_TYPE = "application/x-allkin-note";
const FOLDER_TYPE = "application/x-allkin-note-folder";
/** The column: its width by default and its bounds, in pixels. */
const COL_DEFAULT = 272;
const COL_MIN = 190;
const COL_MAX = 520;
const toast = (message, kind = "ok") => core.toast?.(message, kind);
const isPhone = () => window.matchMedia("(max-width: 720px)").matches;

/* ---- Icons: Phosphor, light (and duotone for the tab) -------------------- */

// Generated from @phosphor-icons/core (MIT): light weight, and duotone for the tab.
const ICONS = {
  "notebook:light": [{"d":"M182,112a6,6,0,0,1-6,6H112a6,6,0,0,1,0-12h64A6,6,0,0,1,182,112Zm-6,26H112a6,6,0,0,0,0,12h64a6,6,0,0,0,0-12Zm46-90V208a14,14,0,0,1-14,14H48a14,14,0,0,1-14-14V48A14,14,0,0,1,48,34H208A14,14,0,0,1,222,48ZM48,210H74V46H48a2,2,0,0,0-2,2V208A2,2,0,0,0,48,210ZM210,48a2,2,0,0,0-2-2H86V210H208a2,2,0,0,0,2-2Z"}],
  "note:light": [{"d":"M90,96a6,6,0,0,1,6-6h64a6,6,0,0,1,0,12H96A6,6,0,0,1,90,96Zm6,38h64a6,6,0,0,0,0-12H96a6,6,0,0,0,0,12Zm32,20H96a6,6,0,0,0,0,12h32a6,6,0,0,0,0-12ZM222,48V156.69a13.94,13.94,0,0,1-4.1,9.9L166.59,217.9a13.94,13.94,0,0,1-9.9,4.1H48a14,14,0,0,1-14-14V48A14,14,0,0,1,48,34H208A14,14,0,0,1,222,48ZM48,210H154V160a6,6,0,0,1,6-6h50V48a2,2,0,0,0-2-2H48a2,2,0,0,0-2,2V208A2,2,0,0,0,48,210Zm153.52-44H166v35.52Z"}],
  "note-blank:light": [{"d":"M208,34H48A14,14,0,0,0,34,48V208a14,14,0,0,0,14,14H156.69a13.94,13.94,0,0,0,9.9-4.1l51.31-51.31a13.94,13.94,0,0,0,4.1-9.9V48A14,14,0,0,0,208,34ZM46,208V48a2,2,0,0,1,2-2H208a2,2,0,0,1,2,2V154H160a6,6,0,0,0-6,6v50H48A2,2,0,0,1,46,208Zm120-6.49V166h35.52Z"}],
  "push-pin:light": [{"d":"M233.91,82.79,173.22,22.1a14,14,0,0,0-19.81,0L98.93,76.77c-9.52-3.25-34-8.34-59.71,12.41A14,14,0,0,0,38.1,110l49.71,49.71-44.05,44a6,6,0,1,0,8.48,8.48l44.05-44.05L146,217.89a14,14,0,0,0,9.9,4.11q.49,0,1,0a14,14,0,0,0,10.19-5.54c19.72-26.21,17.15-47.23,12.46-59.3l54.37-54.55A14,14,0,0,0,233.91,82.79ZM225.42,94.1h0l-57.27,57.46a6,6,0,0,0-1.11,6.92c9.94,19.88-1.71,40.32-9.54,50.72a2,2,0,0,1-3,.2L46.58,101.51a2,2,0,0,1,.18-3c12.5-10.09,24.5-12.76,33.7-12.76a42.13,42.13,0,0,1,17.25,3.41A6,6,0,0,0,104.64,88L161.9,30.59a2,2,0,0,1,2.83,0l60.69,60.68A2,2,0,0,1,225.42,94.1Z"}],
  "push-pin-slash:light": [{"d":"M52.44,36A6,6,0,0,0,43.56,44L71.27,74.51C61.78,76,50.6,80,39.22,89.18A14,14,0,0,0,38.1,110l49.71,49.71-44.05,44a6,6,0,1,0,8.48,8.48l44.05-44.05L146,217.89a14,14,0,0,0,9.9,4.11q.49,0,1,0a14,14,0,0,0,10.19-5.54,85.51,85.51,0,0,0,12.44-22.84l24,26.45a6,6,0,1,0,8.87-8.08ZM157.49,209.21a2,2,0,0,1-3,.2L46.58,101.51a2,2,0,0,1,.18-3c13.18-10.64,25.84-12.9,34.79-12.7L170,183.11C167.83,193.74,162.11,203.07,157.49,209.21Zm76.42-106.62-44.65,44.78a6,6,0,1,1-8.5-8.47l44.65-44.79a2,2,0,0,0,0-2.84L164.73,30.59a2,2,0,0,0-2.83,0L120.68,71.94a6,6,0,0,1-8.5-8.47l41.23-41.36a14,14,0,0,1,19.81,0l60.69,60.69A14,14,0,0,1,233.91,102.59Z"}],
  "trash:light": [{"d":"M216,50H174V40a22,22,0,0,0-22-22H104A22,22,0,0,0,82,40V50H40a6,6,0,0,0,0,12H50V208a14,14,0,0,0,14,14H192a14,14,0,0,0,14-14V62h10a6,6,0,0,0,0-12ZM94,40a10,10,0,0,1,10-10h48a10,10,0,0,1,10,10V50H94ZM194,208a2,2,0,0,1-2,2H64a2,2,0,0,1-2-2V62H194ZM110,104v64a6,6,0,0,1-12,0V104a6,6,0,0,1,12,0Zm48,0v64a6,6,0,0,1-12,0V104a6,6,0,0,1,12,0Z"}],
  "folder:light": [{"d":"M216,74H130.49l-27.9-27.9a13.94,13.94,0,0,0-9.9-4.1H40A14,14,0,0,0,26,56V200.62A13.39,13.39,0,0,0,39.38,214H216.89A13.12,13.12,0,0,0,230,200.89V88A14,14,0,0,0,216,74ZM40,54H92.69a2,2,0,0,1,1.41.59L113.51,74H38V56A2,2,0,0,1,40,54ZM218,200.89a1.11,1.11,0,0,1-1.11,1.11H39.38A1.4,1.4,0,0,1,38,200.62V86H216a2,2,0,0,1,2,2Z"}],
  "folder-open:light": [{"d":"M243.36,111.81A14,14,0,0,0,232,106H214V88a14,14,0,0,0-14-14H130L101.74,52.8a14.06,14.06,0,0,0-8.4-2.8H40A14,14,0,0,0,26,64V208a6,6,0,0,0,6,6H211.1a6,6,0,0,0,5.69-4.1l28.49-85.47A14,14,0,0,0,243.36,111.81ZM40,62H93.34a2,2,0,0,1,1.2.4L124.4,84.8A6,6,0,0,0,128,86h72a2,2,0,0,1,2,2v18H69.77a14,14,0,0,0-13.28,9.57L38,171V64A2,2,0,0,1,40,62Zm193.9,58.63L206.78,202H40.33l27.54-82.63a2,2,0,0,1,1.9-1.37H232a2,2,0,0,1,1.9,2.63Z"}],
  "folder-plus:light": [{"d":"M216,74H130.49l-27.9-27.9a13.94,13.94,0,0,0-9.9-4.1H40A14,14,0,0,0,26,56V200.62A13.39,13.39,0,0,0,39.38,214H216.89A13.12,13.12,0,0,0,230,200.89V88A14,14,0,0,0,216,74ZM40,54H92.69a2,2,0,0,1,1.41.59L113.51,74H38V56A2,2,0,0,1,40,54ZM218,200.89a1.11,1.11,0,0,1-1.11,1.11H39.38A1.4,1.4,0,0,1,38,200.62V86H216a2,2,0,0,1,2,2ZM158,144a6,6,0,0,1-6,6H134v18a6,6,0,0,1-12,0V150H104a6,6,0,0,1,0-12h18V120a6,6,0,0,1,12,0v18h18A6,6,0,0,1,158,144Z"}],
  "plus:light": [{"d":"M222,128a6,6,0,0,1-6,6H134v82a6,6,0,0,1-12,0V134H40a6,6,0,0,1,0-12h82V40a6,6,0,0,1,12,0v82h82A6,6,0,0,1,222,128Z"}],
  "dots-three:light": [{"d":"M138,128a10,10,0,1,1-10-10A10,10,0,0,1,138,128ZM60,118a10,10,0,1,0,10,10A10,10,0,0,0,60,118Zm136,0a10,10,0,1,0,10,10A10,10,0,0,0,196,118Z"}],
  "magnifying-glass:light": [{"d":"M228.24,219.76l-51.38-51.38a86.15,86.15,0,1,0-8.48,8.48l51.38,51.38a6,6,0,0,0,8.48-8.48ZM38,112a74,74,0,1,1,74,74A74.09,74.09,0,0,1,38,112Z"}],
  "caret-right:light": [{"d":"M180.24,132.24l-80,80a6,6,0,0,1-8.48-8.48L167.51,128,91.76,52.24a6,6,0,0,1,8.48-8.48l80,80A6,6,0,0,1,180.24,132.24Z"}],
  "caret-left:light": [{"d":"M164.24,203.76a6,6,0,1,1-8.48,8.48l-80-80a6,6,0,0,1,0-8.48l80-80a6,6,0,0,1,8.48,8.48L88.49,128Z"}],
  "arrow-counter-clockwise:light": [{"d":"M222,128a94,94,0,0,1-92.74,94H128a93.43,93.43,0,0,1-64.5-25.65,6,6,0,1,1,8.24-8.72A82,82,0,1,0,70,70l-.19.19L39.44,98H72a6,6,0,0,1,0,12H24a6,6,0,0,1-6-6V56a6,6,0,0,1,12,0V90.34L61.63,61.4A94,94,0,0,1,222,128Z"}],
  "copy-simple:light": [{"d":"M184,66H40a6,6,0,0,0-6,6V216a6,6,0,0,0,6,6H184a6,6,0,0,0,6-6V72A6,6,0,0,0,184,66Zm-6,144H46V78H178ZM222,40V184a6,6,0,0,1-12,0V46H72a6,6,0,0,1,0-12H216A6,6,0,0,1,222,40Z"}],
  "download-simple:light": [{"d":"M222,144v64a6,6,0,0,1-6,6H40a6,6,0,0,1-6-6V144a6,6,0,0,1,12,0v58H210V144a6,6,0,0,1,12,0Zm-98.24,4.24a6,6,0,0,0,8.48,0l40-40a6,6,0,0,0-8.48-8.48L134,129.51V32a6,6,0,0,0-12,0v97.51L92.24,99.76a6,6,0,0,0-8.48,8.48Z"}],
  "pencil-simple:light": [{"d":"M225.9,74.78,181.21,30.09a14,14,0,0,0-19.8,0L38.1,153.41a13.94,13.94,0,0,0-4.1,9.9V208a14,14,0,0,0,14,14H92.69a13.94,13.94,0,0,0,9.9-4.1L225.9,94.58a14,14,0,0,0,0-19.8ZM94.1,209.41a2,2,0,0,1-1.41.59H48a2,2,0,0,1-2-2V163.31a2,2,0,0,1,.59-1.41L136,72.48,183.51,120ZM217.41,86.1,192,111.51,144.49,64,169.9,38.58a2,2,0,0,1,2.83,0l44.68,44.69a2,2,0,0,1,0,2.83Z"}],
  "arrow-elbow-down-right:light": [{"d":"M220.24,180.24l-48,48a6,6,0,0,1-8.48-8.48L201.51,182H72a6,6,0,0,1-6-6V32a6,6,0,0,1,12,0V170H201.51l-37.75-37.76a6,6,0,1,1,8.48-8.48l48,48A6,6,0,0,1,220.24,180.24Z"}],
  "arrow-bend-left-up:light": [{"d":"M206,224a6,6,0,0,1-6,6A102.12,102.12,0,0,1,98,128V46.49L60.24,84.24a6,6,0,0,1-8.48-8.48l48-48a6,6,0,0,1,8.48,0l48,48a6,6,0,1,1-8.48,8.48L110,46.49V128a90.1,90.1,0,0,0,90,90A6,6,0,0,1,206,224Z"}],
  "clipboard-text:light": [{"d":"M166,152a6,6,0,0,1-6,6H96a6,6,0,0,1,0-12h64A6,6,0,0,1,166,152Zm-6-38H96a6,6,0,0,0,0,12h64a6,6,0,0,0,0-12Zm54-66V216a14,14,0,0,1-14,14H56a14,14,0,0,1-14-14V48A14,14,0,0,1,56,34H93.17a45.91,45.91,0,0,1,69.66,0H200A14,14,0,0,1,214,48ZM94,64v2h68V64a34,34,0,0,0-68,0ZM202,48a2,2,0,0,0-2-2H170.33A45.77,45.77,0,0,1,174,64v8a6,6,0,0,1-6,6H88a6,6,0,0,1-6-6V64a45.77,45.77,0,0,1,3.67-18H56a2,2,0,0,0-2,2V216a2,2,0,0,0,2,2H200a2,2,0,0,0,2-2Z"}],
  "warning:light": [{"d":"M235.07,189.09,147.61,37.22h0a22.75,22.75,0,0,0-39.22,0L20.93,189.09a21.53,21.53,0,0,0,0,21.72A22.35,22.35,0,0,0,40.55,222h174.9a22.35,22.35,0,0,0,19.6-11.19A21.53,21.53,0,0,0,235.07,189.09ZM224.66,204.8a10.46,10.46,0,0,1-9.21,5.2H40.55a10.46,10.46,0,0,1-9.21-5.2,9.51,9.51,0,0,1,0-9.72L118.79,43.21a10.75,10.75,0,0,1,18.42,0l87.46,151.87A9.51,9.51,0,0,1,224.66,204.8ZM122,144V104a6,6,0,0,1,12,0v40a6,6,0,0,1-12,0Zm16,36a10,10,0,1,1-10-10A10,10,0,0,1,138,180Z"}],
  "sidebar-simple:light": [{"d":"M216,42H40A14,14,0,0,0,26,56V200a14,14,0,0,0,14,14H216a14,14,0,0,0,14-14V56A14,14,0,0,0,216,42ZM38,200V56a2,2,0,0,1,2-2H82V202H40A2,2,0,0,1,38,200Zm180,0a2,2,0,0,1-2,2H94V54H216a2,2,0,0,1,2,2Z"}],
  "chat-circle-text:light": [{"d":"M166,112a6,6,0,0,1-6,6H96a6,6,0,0,1,0-12h64A6,6,0,0,1,166,112Zm-6,26H96a6,6,0,0,0,0,12h64a6,6,0,0,0,0-12Zm70-10A102,102,0,0,1,79.31,217.65L44.44,229.27a14,14,0,0,1-17.71-17.71l11.62-34.87A102,102,0,1,1,230,128Zm-12,0A90,90,0,1,0,50.08,173.06a6,6,0,0,1,.5,4.91L38.12,215.35a2,2,0,0,0,2.53,2.53L78,205.42a6.2,6.2,0,0,1,1.9-.31,6.09,6.09,0,0,1,3,.81A90,90,0,0,0,218,128Z"}],
  "paper-plane-tilt:light": [{"d":"M225.88,30.12a13.83,13.83,0,0,0-13.7-3.58l-.11,0L20.14,84.77A14,14,0,0,0,18,110.85l85.56,41.64L145.12,238a13.87,13.87,0,0,0,12.61,8c.4,0,.81,0,1.21-.05a13.9,13.9,0,0,0,12.29-10.09l58.2-191.93,0-.11A13.83,13.83,0,0,0,225.88,30.12Zm-8,10.4L159.73,232.43l0,.11a2,2,0,0,1-3.76.26l-40.68-83.58,49-49a6,6,0,1,0-8.49-8.49l-49,49L23.15,100a2,2,0,0,1,.31-3.74l.11,0L215.48,38.08a1.94,1.94,0,0,1,1.92.52A2,2,0,0,1,217.92,40.52Z"}],
  "x:light": [{"d":"M204.24,195.76a6,6,0,1,1-8.48,8.48L128,136.49,60.24,204.24a6,6,0,0,1-8.48-8.48L119.51,128,51.76,60.24a6,6,0,0,1,8.48-8.48L128,119.51l67.76-67.75a6,6,0,0,1,8.48,8.48L136.49,128Z"}],
  "check:light": [{"d":"M228.24,76.24l-128,128a6,6,0,0,1-8.48,0l-56-56a6,6,0,0,1,8.48-8.48L96,191.51,219.76,67.76a6,6,0,0,1,8.48,8.48Z"}],
  "arrows-down-up:light": [{"d":"M116.24,171.76a6,6,0,0,1,0,8.48l-32,32a6,6,0,0,1-8.48,0l-32-32a6,6,0,0,1,8.48-8.48L74,193.51V48a6,6,0,0,1,12,0V193.51l21.76-21.75A6,6,0,0,1,116.24,171.76Zm96-96-32-32a6,6,0,0,0-8.48,0l-32,32a6,6,0,0,0,8.48,8.48L170,62.49V208a6,6,0,0,0,12,0V62.49l21.76,21.75a6,6,0,0,0,8.48-8.48Z"}],
  "clock-counter-clockwise:light": [{"d":"M134,80v44.6l37.09,22.25a6,6,0,0,1-6.18,10.3l-40-24A6,6,0,0,1,122,128V80a6,6,0,0,1,12,0Zm-6-46A93.4,93.4,0,0,0,61.51,61.56c-8.58,8.68-16,17-23.51,25.8V64a6,6,0,0,0-12,0v40a6,6,0,0,0,6,6H72a6,6,0,0,0,0-12H44.73C52.86,88.29,60.79,79.35,70,70a82,82,0,1,1,1.7,117.62,6,6,0,1,0-8.24,8.72A94,94,0,1,0,128,34Z"}],
  "text-aa:light": [{"d":"M85.43,53.45a6,6,0,0,0-10.86,0l-64,136a6,6,0,1,0,10.86,5.11L38.63,158h82.74l17.2,36.55a6,6,0,1,0,10.86-5.11ZM44.28,146,80,70.09,115.72,146ZM200,98c-12.21,0-21.71,3.28-28.23,9.74a6,6,0,0,0,8.46,8.52c4.18-4.15,10.84-6.26,19.77-6.26,14.34,0,26,9.87,26,22v7.24A40.36,40.36,0,0,0,200,130c-20.95,0-38,15.25-38,34s17.05,34,38,34a40.36,40.36,0,0,0,26-9.24V192a6,6,0,0,0,12,0V132C238,113.25,221,98,200,98Zm0,88c-14.34,0-26-9.87-26-22s11.66-22,26-22,26,9.87,26,22S214.34,186,200,186Z"}],
  "notebook:duotone": [{"d":"M80,40V216H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8Z","o":"0.2"},{"d":"M184,112a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h64A8,8,0,0,1,184,112Zm-8,24H112a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Zm48-88V208a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM48,208H72V48H48Zm160,0V48H88V208H208Z"}],
};

function iconSvg(name) {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><g transform="scale(0.09375)" fill="currentColor" stroke="none">${(ICONS[`${name}:light`] ?? [])
    .map((p) => `<path d="${p.d}"/>`)
    .join("")}</g></svg>`;
}

function dualIcon(name, color) {
  const group = (weight, cls) =>
    `<g class="${cls}" transform="scale(0.09375)" fill="${color}" stroke="none">${(ICONS[`${name}:${weight}`] ?? [])
      .map((p) => `<path d="${p.d}"${p.o ? ` opacity="${p.o}"` : ""}/>`)
      .join("")}</g>`;
  return `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">${group("light", "ph-light")}${group("duotone", "ph-duo")}</svg>`;
}

const TAB_ICON = dualIcon("notebook", "#f59e0b");

function fillIcons(root) {
  for (const node of root.querySelectorAll("[data-nt-icon], [data-nt-label]")) {
    const label = node.dataset.ntLabel;
    node.innerHTML = (node.dataset.ntIcon ? iconSvg(node.dataset.ntIcon) : "") + (label ? `<span>${core.escapeHtml(t(label))}</span>` : "");
  }
}

/** An element, its class and its text. */
function h(tag, className = "", text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function iconNode(name, className = "nt-icon") {
  const node = h("span", className);
  node.setAttribute("aria-hidden", "true");
  node.innerHTML = iconSvg(name);
  return node;
}

/* ---- Paths --------------------------------------------------------------- */

/** A path of the notepad, as the shared folder knows it. */
const full = (path) => (path ? `${ROOT}/${path}` : ROOT);
const joinPath = (folder, name) => (folder ? `${folder}/${name}` : name);
const parentOf = (path) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
const baseOf = (path) => path.slice(path.lastIndexOf("/") + 1);
const titleOf = (path) => baseOf(path).replace(/\.md$/i, "");
const isInside = (path, folder) => path === folder || path.startsWith(`${folder}/`);
/** `path` once `from` has become `to` (a rename, a move). */
const rebase = (path, from, to) => (path === from ? to : path.startsWith(`${from}/`) ? to + path.slice(from.length) : path);
/** The folders a path is in, the nearest last: "a/b/c.md" -> ["a", "a/b"]. */
function ancestorsOf(path) {
  const out = [];
  const parts = path.split("/");
  for (let i = 1; i < parts.length; i++) out.push(parts.slice(0, i).join("/"));
  return out;
}
const folderLabel = (folder) => (folder ? folder.split("/").join(" / ") : t("plugin.notes.root"));

/** A name the user typed, made fit for a file or a folder; "" when nothing is left. */
function cleanName(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\\/\0-\x1f]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\s_]+/, "")
    .trim()
    .slice(0, 100)
    .trim();
}

/* ---- State --------------------------------------------------------------- */

/** path → { path, name, folders: [path], notes: [path] } ; "" is the root. */
let folders = new Map([["", { path: "", name: "", folders: [], notes: [] }]]);
/** path → { path, title, folder, size, createdAt, modifiedAt } */
let notes = new Map();
/** The bin: [{ name, type, modifiedAt }] */
let trash = [];
/** .notes.json */
let meta = { pinned: [], trash: {} };
/** path → { modifiedAt, text }: the texts already read, for excerpts and search. */
const contents = new Map();
/** The note open: { path, content, saved, modifiedAt, timer, chain } */
let current = null;
/** BIN while the bin is shown in place of the note. */
let place = null;
let editor = null;
let query = "";
let scanning = null;
let openSeq = 0;
/** The passage selected in the note, kept for "Ask an agent". */
let selectionText = "";
/** What is being dragged: { kind: "note" | "folder", path }. */
let dragging = null;

const prefs = (() => {
  const base = { note: null, folder: "", sort: "modified", collapsed: [], folded: false, colWidth: null, askAgent: null, askPrompt: null };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
    return { ...base, ...(saved && typeof saved === "object" ? saved : {}) };
  } catch {
    return base;
  }
})();
function savePrefs() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(prefs));
  } catch {
    // No storage: the notepad opens on its first note next time, nothing else.
  }
}

const isPinned = (path) => meta.pinned.includes(path);
const isOpen = (folder) => !prefs.collapsed.includes(folder);

/* ---- Reading the notepad ------------------------------------------------- */

async function readMeta() {
  try {
    const raw = JSON.parse(await share.read(full(META)));
    return {
      pinned: Array.isArray(raw?.pinned) ? raw.pinned.filter((p) => typeof p === "string") : [],
      trash: raw?.trash && typeof raw.trash === "object" && !Array.isArray(raw.trash) ? raw.trash : {},
    };
  } catch {
    return { pinned: [], trash: {} };
  }
}

let metaChain = Promise.resolve();
/** Writes .notes.json, one write after the other. */
function saveMeta() {
  const text = `${JSON.stringify({ version: 1, pinned: meta.pinned, trash: meta.trash }, null, 2)}\n`;
  metaChain = metaChain.then(() => share.write(full(META), text)).catch((err) => toast(t("plugin.notes.error", { message: err.message }), "ko"));
  return metaChain;
}

/** Reads folders, notes, bin and .notes.json again. Calls made meanwhile share the same reading. */
function scan() {
  scanning ??= (async () => {
    // A write of .notes.json under way lands before it is read again.
    await metaChain;
    const nextFolders = new Map();
    const nextNotes = new Map();
    // What the root holds says whether there is a bin and a .notes.json to read.
    let hasTrash = false;
    let hasMeta = false;
    const walk = async (path, depth) => {
      let entries;
      try {
        entries = await share.list(full(path));
      } catch (err) {
        if (path) return;
        // First opening: the folder of the notepad does not exist yet.
        try {
          await share.mkdir(ROOT);
          entries = [];
        } catch {
          throw err;
        }
      }
      const folder = { path, name: baseOf(path), folders: [], notes: [] };
      nextFolders.set(path, folder);
      for (const entry of entries) {
        if (!path && entry.name === META) hasMeta = true;
        if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
        const child = joinPath(path, entry.name);
        if (entry.type === "dir") {
          if (!path && entry.name === TRASH) hasTrash = true;
          else folder.folders.push(child);
        } else if (/\.md$/i.test(entry.name)) {
          folder.notes.push(child);
          nextNotes.set(child, { path: child, title: titleOf(child), folder: path, size: entry.size, createdAt: entry.createdAt, modifiedAt: entry.modifiedAt });
        }
      }
      if (depth < MAX_DEPTH) await Promise.all(folder.folders.map((sub) => walk(sub, depth + 1)));
      else folder.folders = [];
    };
    await walk("", 0);
    const [nextTrash, nextMeta] = await Promise.all([
      hasTrash ? share.list(full(TRASH)).catch(() => []) : [],
      hasMeta ? readMeta() : { pinned: [], trash: {} },
    ]);
    folders = nextFolders;
    notes = nextNotes;
    trash = nextTrash.filter((entry) => !entry.name.startsWith("."));
    meta = nextMeta;
    for (const path of contents.keys()) if (!notes.has(path)) contents.delete(path);
  })().finally(() => {
    scanning = null;
  });
  return scanning;
}

/** The text of a note, read once per version of the file. */
async function textOf(path) {
  const note = notes.get(path);
  if (!note) return "";
  if (current?.path === path) return current.content;
  const known = contents.get(path);
  if (known && known.modifiedAt === note.modifiedAt) return known.text;
  const text = await share.read(full(path));
  contents.set(path, { modifiedAt: note.modifiedAt, text });
  return text;
}

/** Runs `job` over `items`, a few at a time. */
async function pooled(items, job, size = 5) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(size, queue.length) }, async () => {
      while (queue.length) await job(queue.shift()).catch(() => {});
    }),
  );
}

/** Markdown read as plain text: what an excerpt, a search or a count looks at. */
function plainText(markdown) {
  return String(markdown ?? "")
    .replace(/```[^\n]*\n?/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(?:#{1,6}|>+|[-*+]|\d+[.)])\s+/gm, "")
    .replace(/^\s*\[[ xX]\]\s+/gm, "")
    .replace(/[*_~`|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const wordsOf = (text) => (text ? text.split(" ").length : 0);

/** An excerpt around `needle`, as [before, match, after]; the start of the text without one. */
function excerptOf(text, needle = "") {
  const plain = plainText(text);
  if (needle) {
    const at = plain.toLowerCase().indexOf(needle);
    if (at >= 0) {
      const start = Math.max(0, at - 28);
      return [`${start ? "…" : ""}${plain.slice(start, at)}`, plain.slice(at, at + needle.length), plain.slice(at + needle.length, at + needle.length + 100)];
    }
  }
  return [plain.slice(0, 140), "", ""];
}

/* ---- Saving the note open ------------------------------------------------ */

function setState(key) {
  const node = el("nt-state");
  node.textContent = key ? t(`plugin.notes.state.${key}`) : "";
  node.classList.toggle("is-error", key === "error");
}

function scheduleSave() {
  const note = current;
  if (!note) return;
  setState("editing");
  clearTimeout(note.timer);
  note.timer = setTimeout(() => void save(note), SAVE_DELAY);
  renderFoot();
}

/** Writes the note if it changed. One write at a time per note: a rename or a
 *  move joins the same chain, so that a text never lands at a path just left. */
function save(note = current) {
  if (!note) return Promise.resolve();
  clearTimeout(note.timer);
  note.timer = null;
  note.chain = note.chain.then(async () => {
    if (note.content === note.saved) return;
    const text = note.content;
    if (current === note) setState("saving");
    try {
      const result = await share.write(full(note.path), text);
      note.saved = text;
      note.modifiedAt = result?.modifiedAt ?? new Date().toISOString();
      const listed = notes.get(note.path);
      if (listed) {
        listed.modifiedAt = note.modifiedAt;
        listed.size = text.length;
      }
      contents.set(note.path, { modifiedAt: note.modifiedAt, text });
      if (current === note) {
        setState(note.content === text ? "saved" : "editing");
        renderFoot();
      }
    } catch (err) {
      if (current === note) setState("error");
      toast(t("plugin.notes.save.failed", { message: err.message }), "ko");
    }
  });
  return note.chain;
}

/** Everything typed is on disk when this resolves. */
const flush = () => save(current);

/* ---- The Markdown editor ------------------------------------------------- */

const RASTER = /\.(png|jpe?g|gif|webp|avif|bmp|ico)$/i;

function safeFileName(name) {
  const dot = name.lastIndexOf(".");
  const clean = (part) => part.normalize("NFC").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^[-.]+|[-.]+$/g, "");
  const base = clean(dot > 0 ? name.slice(0, dot) : name) || "file";
  const ext = dot > 0 ? clean(name.slice(dot + 1)).toLowerCase() : "";
  return ext ? `${base}.${ext}` : base;
}

/** Where the editor stores what is dropped in a note, and where it reads it
 *  from. One folder for the whole notepad (_files/), and addresses written
 *  from the root of the notepad: a note keeps its images when it moves. */
const editorFiles = {
  async upload(file) {
    const name = `${Date.now().toString(36)}-${safeFileName(file.name)}`;
    const form = new FormData();
    form.append("path", `${ROOT}/${FILES}/${name}`);
    form.append("file", file, name);
    const res = await fetch(`/api/agents/${encodeURIComponent(share.scope)}/data/upload`, { method: "POST", body: form, credentials: "same-origin" });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.path) throw new Error(payload.error || t("plugin.notes.upload.failed", { status: res.status }));
    return { src: String(payload.path).slice(ROOT.length + 1), name: file.name };
  },
  resolve(src, usage) {
    let path = String(src ?? "").trim();
    try {
      path = decodeURIComponent(path);
    } catch {
      // Badly encoded: taken as it is.
    }
    path = path.replace(/^\.\//, "");
    if (!path || path.startsWith("/") || path.split("/").some((part) => part === ".." || part === "." || part === "")) return null;
    // Written by this notepad: from its root. Anything else (a note written by
    // an agent, by hand): next to the note.
    const target = path.startsWith(`${FILES}/`) ? path : joinPath(current ? parentOf(current.path) : "", path);
    const inline = usage === "image" || RASTER.test(path) || /\.pdf$/i.test(path);
    return share.url(full(target), !inline);
  },
};

/** The editor, created at the first note opened: the capability is resolved
 *  when used, never at load. False when the Markdown editor is not there. */
function mountEditor() {
  if (editor) return true;
  const markdown = Allkin.capability("markdown-editor");
  if (!markdown) return false;
  editor = markdown.create({
    host: el("nt-doc"),
    toolbar: el("nt-toolbar"),
    spellcheck: true,
    files: editorFiles,
    doc: {
      getContent: () => current?.content ?? "",
      setContent: (next) => {
        if (!current || next === current.content) return;
        current.content = next;
        scheduleSave();
      },
      isActive: () => Boolean(current) && place !== BIN && core.activeTab()?.kind === KIND,
    },
  });
  return true;
}

/* ---- What the right side shows: a note, nothing, or the bin -------------- */

function showNote() {
  const inBin = place === BIN;
  const open = Boolean(current) && !inBin;
  el("nt-note-empty").classList.toggle("hidden", open || inBin);
  el("nt-note-body").classList.toggle("hidden", !open);
  el("nt-trash").classList.toggle("hidden", !inBin);
  el("nt-note-menu").disabled = !open;
  el("nt-ask").disabled = !open;
  el("nt-note-menu").classList.toggle("hidden", inBin);
  el("nt-ask").classList.toggle("hidden", inBin);
  el("nt-empty-trash").classList.toggle("hidden", !inBin || trash.length === 0);
  if (open) el("nt-title").value = titleOf(current.path);
  markCurrentRows();
  renderFoot();
  renderWhere();
}

/** The rows of the column that stand for what is shown. */
function markCurrentRows() {
  const col = el("nt-col");
  for (const row of col.querySelectorAll(".nt-row, .nt-hit")) {
    const kind = row.dataset.kind;
    const on =
      (kind === "bin" && place === BIN) ||
      (kind === "note" && place !== BIN && Boolean(current) && row.dataset.path === current.path) ||
      (kind === "folder" && place !== BIN && !current && row.dataset.path === prefs.folder && prefs.folder !== "");
    row.classList.toggle("is-current", on);
  }
}

function renderFoot() {
  const foot = el("nt-foot");
  if (!current) return foot.replaceChildren();
  const plain = plainText(current.content);
  foot.textContent = [tn("plugin.notes.words", wordsOf(plain)), tn("plugin.notes.characters", plain.length), t("plugin.notes.modified", { date: core.formatDateTime(current.modifiedAt) })].join(" · ");
}

async function openNote(path, { focus = null } = {}) {
  if (current?.path !== path) {
    const seq = ++openSeq;
    await flush();
    const note = notes.get(path);
    if (!note || seq !== openSeq) return;
    let text;
    try {
      text = await share.read(full(path));
    } catch (err) {
      toast(t("plugin.notes.error", { message: err.message }), "ko");
      return;
    }
    if (seq !== openSeq) return;
    contents.set(path, { modifiedAt: note.modifiedAt, text });
    current = { path, content: text, saved: text, modifiedAt: note.modifiedAt, timer: null, chain: Promise.resolve() };
    selectionText = "";
    prefs.note = path;
    prefs.folder = parentOf(path);
    savePrefs();
    setState("");
    place = null;
    showNote();
    if (!mountEditor()) return;
    editor.render();
    el("nt-doc").scrollTop = 0;
  } else if (place === BIN) {
    place = null;
    showNote();
  }
  setPane("note");
  if (focus === "title") {
    el("nt-title").focus();
    el("nt-title").select();
  } else if (focus === "text") editor?.focus("end");
}

/** Closes the note open (it left: deleted, moved to the bin). */
function closeNote() {
  if (!current) return;
  clearTimeout(current.timer);
  current = null;
  selectionText = "";
  openSeq++;
  prefs.note = null;
  savePrefs();
  setState("");
  showNote();
  editor?.render();
  if (el("nt-view").dataset.pane === "note" && place !== BIN) setPane("column");
}

/** The bin, in place of the note. */
function showBin() {
  if (query) clearSearch();
  place = BIN;
  renderTrash();
  showNote();
  setPane("note");
}

/* ---- Panes (phone) and the bar ------------------------------------------- */

function setPane(pane) {
  el("nt-view").dataset.pane = pane;
  renderWhere();
}

/** What the bar says: the folder of the note shown (each segment a button),
 *  the bin, or the folder chosen in the tree. */
function renderWhere() {
  const nav = el("nt-crumbs");
  const crumb = (label, folder, last) => {
    const button = h("button", "nt-crumb", label);
    button.type = "button";
    button.disabled = last;
    if (!last) button.addEventListener("click", () => revealFolder(folder));
    return button;
  };
  const sep = () => iconNode("caret-right", "nt-crumb-sep");
  const pieces = [];
  if (place === BIN) pieces.push(crumb(t("plugin.notes.view.trash"), "", true));
  else {
    const folder = current ? parentOf(current.path) : prefs.folder;
    const chain = folder ? ancestorsOf(`${folder}/x`) : [];
    // At the root, the bar says so; in a folder, the folders alone are named.
    if (!chain.length) pieces.push(crumb(t("plugin.notes.root"), "", true));
    chain.forEach((path, index) => {
      if (index) pieces.push(sep());
      pieces.push(crumb(baseOf(path), path, index === chain.length - 1));
    });
  }
  nav.replaceChildren(...pieces);
}

/** Opens the tree on a folder and shows it. */
function revealFolder(folder) {
  if (query) clearSearch();
  if (place === BIN) {
    place = null;
    showNote();
  }
  prefs.collapsed = prefs.collapsed.filter((p) => !isInside(folder, p));
  prefs.folder = folders.has(folder) ? folder : "";
  savePrefs();
  renderColumn();
  renderWhere();
  if (folder) flashRow("folder", folder);
  setPane("column");
}

/* ---- The column ----------------------------------------------------------- */

function countIn(path) {
  const folder = folders.get(path);
  return folder ? folder.notes.length + folder.folders.reduce((sum, sub) => sum + countIn(sub), 0) : 0;
}

const SORTS = {
  modified: (a, b) => b.modifiedAt.localeCompare(a.modifiedAt),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  title: (a, b) => a.title.localeCompare(b.title, Allkin.i18n.locale, { numeric: true, sensitivity: "base" }),
};
const byName = (a, b) => baseOf(a).localeCompare(baseOf(b), Allkin.i18n.locale, { numeric: true, sensitivity: "base" });

function sortedNotes(paths) {
  const order = SORTS[prefs.sort] ?? SORTS.modified;
  return paths.map((p) => notes.get(p)).filter(Boolean).sort(order);
}

function groupLabel(text, buttons = []) {
  const label = h("p", "nt-group");
  label.appendChild(h("span", "", text));
  for (const { icon, title, onClick } of buttons) {
    const button = h("button", "nt-group-btn");
    button.type = "button";
    button.title = title;
    button.setAttribute("aria-label", title);
    button.innerHTML = iconSvg(icon);
    button.addEventListener("click", (e) => onClick(e));
    label.appendChild(button);
  }
  return label;
}

/** A row of the column: a note, a folder or the bin. */
function treeRow({ kind, path, icon, label, count = null, depth = 0, caret = null }) {
  const row = h("div", "nt-row");
  row.dataset.kind = kind;
  row.dataset.path = path;
  row.tabIndex = 0;
  row.style.setProperty("--nt-depth", String(depth));
  if (caret) {
    const toggle = h("button", `nt-caret${caret.open ? " is-open" : ""}`);
    toggle.type = "button";
    toggle.innerHTML = iconSvg("caret-right");
    toggle.setAttribute("aria-label", t(caret.open ? "plugin.notes.folder.collapse" : "plugin.notes.folder.expand"));
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFolder(path);
    });
    row.appendChild(toggle);
  } else row.appendChild(h("span", "nt-caret-gap"));
  row.append(iconNode(icon), h("span", "nt-name", label));
  if (count) row.appendChild(h("span", "nt-count", String(count)));
  row.addEventListener("keydown", (e) => onRowKey(e, row));
  return row;
}

function toggleFolder(path) {
  prefs.collapsed = isOpen(path) ? [...prefs.collapsed, path] : prefs.collapsed.filter((p) => p !== path);
  savePrefs();
  renderColumn();
}

/** Arrows move along the rows, Enter opens, Delete sends to the bin. */
function onRowKey(e, row) {
  const { kind, path } = row.dataset;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const rows = [...el("nt-col").querySelectorAll(".nt-row, .nt-hit")];
    const at = rows.indexOf(row);
    rows[at + (e.key === "ArrowDown" ? 1 : -1)]?.focus();
  } else if (e.key === "Enter") {
    if (kind === "note") void openNote(path, { focus: "text" });
    else if (kind === "folder") toggleFolder(path);
    else if (kind === "bin") showBin();
  } else if (e.key === "ArrowRight" && kind === "folder" && !isOpen(path)) toggleFolder(path);
  else if (e.key === "ArrowLeft" && kind === "folder" && isOpen(path)) toggleFolder(path);
  else if (e.key === "Delete" && kind === "note") void trashNote(path);
  else if (e.key === "Delete" && kind === "folder") void trashFolder(path);
}

function bindMenu(row, items) {
  row.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openMenu(items(), { x: e.clientX, y: e.clientY });
  });
  core.bindLongPress?.(row, (touch) => openMenu(items(), { x: touch.clientX, y: touch.clientY }));
}

function noteRow(path, depth, { pinnedGroup = false } = {}) {
  const note = notes.get(path);
  const row = treeRow({ kind: "note", path, icon: pinnedGroup ? "push-pin" : "note", label: note.title, depth });
  row.title = note.title;
  row.addEventListener("click", () => void openNote(path));
  bindMenu(row, () => noteMenu(path));
  bindDrag(row, "note", path);
  return row;
}

function folderRow(path, depth) {
  const folder = folders.get(path);
  const open = isOpen(path);
  const row = treeRow({
    kind: "folder",
    path,
    icon: open ? "folder-open" : "folder",
    label: folder.name,
    count: countIn(path),
    depth,
    caret: folder.folders.length || folder.notes.length ? { open } : null,
  });
  row.title = folder.name;
  row.addEventListener("click", () => {
    prefs.folder = path;
    toggleFolder(path);
    renderWhere();
  });
  bindMenu(row, () => folderMenu(path));
  bindDrag(row, "folder", path);
  bindDrop(row, path);
  return row;
}

function renderColumn() {
  const col = el("nt-col");
  if (query) return renderHits();
  const rows = [];
  const pinned = meta.pinned.filter((p) => notes.has(p));
  if (pinned.length) {
    rows.push(groupLabel(t("plugin.notes.view.pinned")));
    for (const path of pinned) rows.push(noteRow(path, 0, { pinnedGroup: true }));
  }

  // The head of the tree is also where a dragged element lands to leave its
  // folder: it changes its words during a drag, never its place.
  const head = groupLabel(dragging ? t("plugin.notes.rootzone") : t("plugin.notes.group.notes"), [
    { icon: "folder-plus", title: t("plugin.notes.folder.newTitle"), onClick: () => void createFolder("") },
    { icon: "arrows-down-up", title: t("plugin.notes.sort.label"), onClick: (e) => openMenu(sortMenu(), { anchor: e.currentTarget }) },
  ]);
  head.classList.add("nt-group-root");
  bindDrop(head, "");
  rows.push(head);
  const addTree = (path, depth) => {
    const folder = folders.get(path);
    if (!folder) return;
    for (const sub of [...folder.folders].sort(byName)) {
      rows.push(folderRow(sub, depth));
      if (isOpen(sub)) addTree(sub, depth + 1);
    }
    for (const note of sortedNotes(folder.notes)) rows.push(noteRow(note.path, depth));
  };
  addTree("", 0);
  if (notes.size === 0 && (folders.get("")?.folders.length ?? 0) === 0) rows.push(h("p", "nt-col-empty", t("plugin.notes.list.none")));

  const bin = treeRow({ kind: "bin", path: BIN, icon: "trash", label: t("plugin.notes.view.trash"), count: trash.length });
  bin.classList.add("nt-row-bin");
  bin.addEventListener("click", showBin);
  bindDrop(bin, BIN);
  rows.push(bin);

  col.replaceChildren(...rows);
  if (dragging) for (const row of col.querySelectorAll(`.nt-row[data-kind="${dragging.kind}"]`)) row.classList.toggle("is-dragged", row.dataset.path === dragging.path);
  markCurrentRows();
}

/** A short light on a row: the one just moved, restored or revealed. */
function flashRow(kind, path) {
  const row = [...el("nt-col").querySelectorAll(`.nt-row[data-kind="${kind}"]`)].find((r) => r.dataset.path === path);
  if (!row) return;
  row.scrollIntoView({ block: "nearest" });
  row.classList.remove("is-flash");
  void row.offsetWidth;
  row.classList.add("is-flash");
  row.addEventListener("animationend", () => row.classList.remove("is-flash"), { once: true });
}

/* ---- Drag and drop: a note or a folder onto a folder, the root, the bin --- */

function bindDrag(row, kind, path) {
  row.draggable = true;
  row.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData(kind === "note" ? NOTE_TYPE : FOLDER_TYPE, path);
    e.dataTransfer.setData("text/plain", path);
    e.dataTransfer.effectAllowed = "move";
    dragging = { kind, path };
    closeMenu();
    // The page changes once the drag image is taken: a layout shift during
    // dragstart itself cancels the drag in some browsers.
    requestAnimationFrame(() => {
      if (dragging?.path !== path) return;
      row.classList.add("is-dragged");
      el("nt-view").classList.add("is-dragging");
      setRootZoneText(true);
    });
  });
  row.addEventListener("dragend", endDrag);
}

/** The head of the tree says "drop here" while something is dragged. */
function setRootZoneText(dragged) {
  const label = el("nt-col").querySelector(".nt-group-root > span");
  if (label) label.textContent = t(dragged ? "plugin.notes.rootzone" : "plugin.notes.group.notes");
}

function endDrag() {
  dragging = null;
  clearTimeout(expandTimer);
  expandTimer = null;
  const view = el("nt-view");
  view.classList.remove("is-dragging");
  setRootZoneText(false);
  for (const node of view.querySelectorAll(".is-drop, .is-dragged")) node.classList.remove("is-drop", "is-dragged");
}

/** What is dragged, from the state or, failing that, from the transfer. */
function draggedFrom(e) {
  if (dragging) return dragging;
  const note = e.dataTransfer.getData(NOTE_TYPE);
  if (note) return { kind: "note", path: note };
  const folder = e.dataTransfer.getData(FOLDER_TYPE);
  return folder ? { kind: "folder", path: folder } : null;
}

/** Whether `item` may land in `folder` ("" the root, BIN the bin). */
function canDrop(item, folder) {
  if (!item) return false;
  if (folder === BIN) return true;
  if (!folders.has(folder) || parentOf(item.path) === folder) return false;
  return item.kind !== "folder" || !isInside(folder, item.path);
}

let expandTimer = null;

function bindDrop(node, folder) {
  const carries = (e) => e.dataTransfer.types.includes(NOTE_TYPE) || e.dataTransfer.types.includes(FOLDER_TYPE);
  node.addEventListener("dragover", (e) => {
    if (!carries(e) || !canDrop(dragging, folder)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (node.classList.contains("is-drop")) return;
    node.classList.add("is-drop");
    // A closed folder hovered for a moment opens, so that what is below is reachable.
    clearTimeout(expandTimer);
    expandTimer = folders.has(folder) && folder && !isOpen(folder) ? setTimeout(() => toggleFolder(folder), 700) : null;
  });
  node.addEventListener("dragleave", (e) => {
    if (node.contains(e.relatedTarget)) return;
    node.classList.remove("is-drop");
    clearTimeout(expandTimer);
    expandTimer = null;
  });
  node.addEventListener("drop", (e) => {
    node.classList.remove("is-drop");
    const item = draggedFrom(e);
    if (!item) return;
    e.preventDefault();
    endDrag();
    if (folder === BIN) void (item.kind === "note" ? trashNote(item.path) : trashFolder(item.path));
    else void moveTo(item.path, folder, item.kind);
  });
}

/* ---- Search: the results take the column ---------------------------------- */

function matching() {
  const needle = query.toLowerCase();
  const order = SORTS[prefs.sort] ?? SORTS.modified;
  return [...notes.values()].filter((n) => n.title.toLowerCase().includes(needle) || plainText(contents.get(n.path)?.text).toLowerCase().includes(needle)).sort(order);
}

function renderHits() {
  const col = el("nt-col");
  const needle = query.toLowerCase();
  const hits = matching();
  const rows = [groupLabel(tn("plugin.notes.count", hits.length))];
  for (const note of hits) {
    const row = h("div", "nt-hit");
    row.dataset.kind = "note";
    row.dataset.path = note.path;
    row.tabIndex = 0;
    const title = h("span", "nt-hit-title");
    title.append(iconNode("note"), h("span", "", note.title));
    const text = h("span", "nt-hit-text");
    const [before, match, after] = excerptOf(contents.get(note.path)?.text, needle);
    text.append(before);
    if (match) text.append(Object.assign(h("mark", "", match)), after);
    row.append(title, h("span", "nt-hit-where", folderLabel(note.folder)), text);
    row.addEventListener("click", () => void openNote(note.path));
    row.addEventListener("keydown", (e) => onRowKey(e, row));
    bindMenu(row, () => noteMenu(note.path));
    rows.push(row);
  }
  if (!hits.length) rows.push(h("p", "nt-col-empty", t("plugin.notes.search.none")));
  col.replaceChildren(...rows);
  markCurrentRows();
}

let searchTimer = null;
function onSearch(value) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    query = value.trim();
    renderColumn();
    renderWhere();
    if (!query) return;
    // Titles answer at once; the texts once they are all read.
    const asked = query;
    await pooled([...notes.keys()], (path) => textOf(path));
    if (asked === query) renderColumn();
  }, 200);
}

function clearSearch() {
  clearTimeout(searchTimer);
  query = "";
  el("nt-search").value = "";
  renderColumn();
  renderWhere();
}

/* ---- The column: folded, resized ------------------------------------------- */

function applyColumn() {
  const view = el("nt-view");
  view.classList.toggle("is-folded", Boolean(prefs.folded));
  const fold = el("nt-fold");
  fold.classList.toggle("is-on", Boolean(prefs.folded));
  fold.setAttribute("aria-pressed", String(Boolean(prefs.folded)));
  fold.title = t(prefs.folded ? "plugin.notes.column.unfold" : "plugin.notes.column.fold");
  fold.setAttribute("aria-label", fold.title);
  const width = Number(prefs.colWidth);
  view.style.setProperty("--nt-col-w", `${width >= COL_MIN && width <= COL_MAX ? width : COL_DEFAULT}px`);
}

function toggleFolded() {
  prefs.folded = !prefs.folded;
  savePrefs();
  applyColumn();
}

function bindHandle() {
  const handle = el("nt-handle");
  const view = el("nt-view");
  let drag = null;
  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, width: el("nt-col").getBoundingClientRect().width };
    handle.setPointerCapture(e.pointerId);
    handle.classList.add("is-active");
    view.classList.add("is-resizing");
    e.preventDefault();
  });
  handle.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const width = Math.round(Math.min(COL_MAX, Math.max(COL_MIN, drag.width + e.clientX - drag.x)));
    view.style.setProperty("--nt-col-w", `${width}px`);
    drag.last = width;
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.last) prefs.colWidth = drag.last;
    savePrefs();
    drag = null;
    handle.classList.remove("is-active");
    view.classList.remove("is-resizing");
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
  // A double click gives the column its width by default.
  handle.addEventListener("dblclick", () => {
    prefs.colWidth = null;
    savePrefs();
    applyColumn();
  });
}

/* ---- Menus ------------------------------------------------------------------ */

function closeMenu() {
  el("nt-menu").classList.add("hidden");
}

/** A menu at a point of the screen, or under a button. */
function openMenu(items, { x, y, anchor } = {}) {
  core.closeTabContextMenu?.();
  window.getSelection?.()?.removeAllRanges?.();
  const menu = el("nt-menu");
  menu.replaceChildren(
    ...items.filter(Boolean).map((item) => {
      if (item === "-") return h("div", "nt-menu-sep");
      const button = h("button", `nt-menu-item${item.danger ? " is-danger" : ""}${item.checked ? " is-checked" : ""}`);
      button.type = "button";
      button.setAttribute("role", item.checked === undefined ? "menuitem" : "menuitemradio");
      if (item.checked !== undefined) button.setAttribute("aria-checked", String(item.checked));
      button.innerHTML = `${iconSvg(item.icon)}<span>${core.escapeHtml(item.label)}</span>${item.checked === undefined ? "" : `<span class="nt-menu-check">${iconSvg("check")}</span>`}`;
      button.addEventListener("click", () => {
        closeMenu();
        void item.run();
      });
      return button;
    }),
  );
  menu.classList.remove("hidden");
  const box = menu.getBoundingClientRect();
  if (anchor) {
    const rect = anchor.getBoundingClientRect();
    x = rect.right - box.width;
    y = rect.bottom + 4;
  }
  menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - box.width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - box.height - 8))}px`;
  menu.querySelector("button")?.focus({ preventScroll: true });
}

function noteMenu(path) {
  const pinned = isPinned(path);
  return [
    { icon: pinned ? "push-pin-slash" : "push-pin", label: t(pinned ? "plugin.notes.note.unpin" : "plugin.notes.note.pin"), run: () => togglePin(path) },
    { icon: "pencil-simple", label: t("plugin.notes.rename"), run: () => openNote(path, { focus: "title" }) },
    { icon: "copy-simple", label: t("plugin.notes.note.duplicate"), run: () => duplicateNote(path) },
    { icon: "arrow-elbow-down-right", label: t("plugin.notes.move"), run: () => openMoveModal(path, "note") },
    parentOf(path) && { icon: "arrow-bend-left-up", label: t("plugin.notes.move.toRoot"), run: () => moveTo(path, "", "note") },
    "-",
    { icon: "chat-circle-text", label: t("plugin.notes.ask"), run: () => openAsk(path) },
    { icon: "clipboard-text", label: t("plugin.notes.note.copyText"), run: () => copyText(path) },
    { icon: "download-simple", label: t("plugin.notes.note.download"), run: () => download(path) },
    "-",
    { icon: "trash", label: t("plugin.notes.delete"), danger: true, run: () => trashNote(path) },
  ];
}

function folderMenu(path) {
  return [
    { icon: "plus", label: t("plugin.notes.note.newHere"), run: () => createNote({ folder: path }) },
    { icon: "folder-plus", label: t("plugin.notes.folder.newSub"), run: () => createFolder(path) },
    "-",
    { icon: "pencil-simple", label: t("plugin.notes.rename"), run: () => renameFolder(path) },
    { icon: "arrow-elbow-down-right", label: t("plugin.notes.move"), run: () => openMoveModal(path, "folder") },
    parentOf(path) && { icon: "arrow-bend-left-up", label: t("plugin.notes.move.toRoot"), run: () => moveTo(path, "", "folder") },
    "-",
    { icon: "trash", label: t("plugin.notes.delete"), danger: true, run: () => trashFolder(path) },
  ];
}

function sortMenu() {
  return ["modified", "created", "title"].map((sort) => ({
    icon: sort === "title" ? "text-aa" : "clock-counter-clockwise",
    label: t(`plugin.notes.sort.${sort}`),
    checked: prefs.sort === sort,
    run: () => {
      prefs.sort = sort;
      savePrefs();
      renderColumn();
    },
  }));
}

/* ---- Windows: "Move to…", "Ask an agent" ------------------------------------- */

function openModal(id) {
  const modal = el(id);
  modal.classList.remove("hidden");
  modal.querySelector("select, textarea, input, button:not(.modal-close)")?.focus({ preventScroll: true });
}

function closeModal(id) {
  el(id).classList.add("hidden");
}

/** Wires everything that dismisses a window: its cross, its Cancel, a click on the veil, Escape. */
function bindModal(id, onClose) {
  const modal = el(id);
  for (const button of modal.querySelectorAll(".modal-close, .modal-cancel")) button.addEventListener("click", onClose);
  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) onClose();
  });
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  });
}

function openMoveModal(path, kind) {
  el("nt-move-title").textContent = t("plugin.notes.move.title", { name: kind === "note" ? titleOf(path) : baseOf(path) });
  const rows = [];
  const add = (folder, depth) => {
    // A folder goes neither into itself nor into what it holds.
    if (kind === "folder" && isInside(folder, path)) return;
    const button = h("button", "nt-row");
    button.type = "button";
    button.style.setProperty("--nt-depth", String(depth));
    button.append(h("span", "nt-caret-gap"), iconNode(folder ? "folder" : "notebook"), h("span", "nt-name", folder ? baseOf(folder) : t("plugin.notes.root")));
    if (folder === parentOf(path)) {
      button.disabled = true;
      button.appendChild(h("span", "nt-count", t("plugin.notes.move.here")));
    }
    button.addEventListener("click", () => {
      closeModal("nt-move");
      void moveTo(path, folder, kind);
    });
    rows.push(button);
    for (const sub of [...(folders.get(folder)?.folders ?? [])].sort(byName)) add(sub, depth + 1);
  };
  add("", 0);
  el("nt-move-list").replaceChildren(...rows);
  openModal("nt-move");
}

/** The agents one may ask, as the core knows them. */
function agentChoices() {
  return (core.state?.agents ?? []).filter((a) => a && typeof a.id === "string" && a.name);
}

/** A message under a field of a window (CLAUDE.md, "Messages about a field"). */
function fieldError(input, message) {
  const old = input.parentElement.querySelector(".field-error");
  old?.remove();
  input.classList.toggle("is-invalid", Boolean(message));
  input.removeAttribute("aria-describedby");
  if (!message) return;
  const note = h("p", "field-error", message);
  note.id = `${input.id}-error`;
  input.setAttribute("aria-describedby", note.id);
  input.after(note);
  input.addEventListener("input", () => fieldError(input, ""), { once: true });
}

let asking = null;

function renderAskScope() {
  const scope = asking?.scope ?? "note";
  for (const button of el("nt-ask-scope").querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.scope === scope);
    button.disabled = button.dataset.scope === "selection" && !asking?.selection;
  }
  el("nt-ask-what-note").textContent = t(asking?.selection ? "plugin.notes.ask.whatNote" : "plugin.notes.ask.noSelection");
  const attach = el("nt-ask-attach");
  attach.replaceChildren(iconNode("note"), h("span"));
  const body = scope === "selection" ? asking.selection : asking?.text ?? "";
  const count = tn("plugin.notes.words", wordsOf(plainText(body)));
  attach.lastChild.innerHTML =
    scope === "selection"
      ? core.escapeHtml(t("plugin.notes.ask.attachSelection", { count }))
      : t("plugin.notes.ask.attachNote", { title: `<b>${core.escapeHtml(asking?.title ?? "")}</b>`, count: core.escapeHtml(count) });
}

async function openAsk(path = current?.path) {
  if (!path || !notes.has(path)) return;
  const agents = agentChoices();
  if (!agents.length) return toast(t("plugin.notes.ask.noAgent"), "ko");
  if (current?.path === path) await flush();
  let text;
  try {
    text = await textOf(path);
  } catch (err) {
    return toast(t("plugin.notes.error", { message: err.message }), "ko");
  }
  const selection = current?.path === path ? selectionText : "";
  asking = { path, title: titleOf(path), text, selection, scope: selection ? "selection" : "note" };
  el("nt-ask-note").textContent = asking.title;
  const select = el("nt-ask-agent");
  select.replaceChildren(
    ...agents.map((agent) => {
      const option = h("option", "", agent.name);
      option.value = agent.id;
      return option;
    }),
  );
  const wanted = [prefs.askAgent, core.state?.currentAgentId].find((id) => agents.some((a) => a.id === id));
  if (wanted) select.value = wanted;
  const prompt = el("nt-ask-prompt");
  prompt.value = prefs.askPrompt ?? t("plugin.notes.ask.defaultPrompt");
  fieldError(prompt, "");
  renderAskScope();
  openModal("nt-ask-modal");
  prompt.focus();
  prompt.select();
}

async function sendAsk() {
  if (!asking) return;
  const prompt = el("nt-ask-prompt");
  const request = prompt.value.trim();
  if (!request) return fieldError(prompt, t("plugin.notes.ask.required"));
  const agentId = el("nt-ask-agent").value;
  const agent = agentChoices().find((a) => a.id === agentId);
  if (!agent) return toast(t("plugin.notes.ask.noAgent"), "ko");
  const body = asking.scope === "selection" ? asking.selection : asking.text;
  const text = `${request}\n\n${t("plugin.notes.ask.message", { title: asking.title })}\n\n${body}`;
  const send = el("nt-ask-send");
  send.disabled = true;
  try {
    await core.sendToAgent(agentId, text);
    prefs.askAgent = agentId;
    prefs.askPrompt = request;
    savePrefs();
    closeModal("nt-ask-modal");
    asking = null;
    toast(t("plugin.notes.ask.sent", { agent: agent.name }));
    // The conversation beside the note; on a phone, in its own window.
    if (isPhone()) core.openTab(agentId, "chat");
    else core.openSplit(agentId, "chat");
  } catch (err) {
    toast(t("plugin.notes.ask.failed", { message: err.message }), "ko");
  } finally {
    send.disabled = false;
  }
}

/** The passage selected in the document, kept while the focus goes to a button. */
function trackSelection() {
  if (!current) return;
  const selection = window.getSelection?.();
  const node = selection?.anchorNode;
  if (!node || !el("nt-doc").contains(node)) return;
  selectionText = selection.isCollapsed ? "" : selection.toString().trim();
}

/* ---- Actions ------------------------------------------------------------------ */

/** Re-reads the notepad and draws it again. */
async function refresh() {
  try {
    await scan();
  } catch (err) {
    toast(t("plugin.notes.error", { message: err.message }), "ko");
  }
  if (!folders.has(prefs.folder)) prefs.folder = "";
  renderColumn();
  if (place === BIN) renderTrash();
  showNote();
  await syncCurrent();
}

/** The note open against what is on disk: an agent may have rewritten it, or removed it. */
async function syncCurrent() {
  const note = current;
  if (!note) return;
  const listed = notes.get(note.path);
  const dirty = note.content !== note.saved;
  if (!listed) {
    // Gone. What is being typed is kept: saving writes the file again.
    if (!dirty) closeNote();
    return;
  }
  if (dirty || listed.modifiedAt === note.modifiedAt) return;
  try {
    const text = await share.read(full(note.path));
    if (current !== note || note.content !== note.saved) return;
    note.content = note.saved = text;
    note.modifiedAt = listed.modifiedAt;
    contents.set(note.path, { modifiedAt: listed.modifiedAt, text });
    editor?.reload();
    renderFoot();
  } catch {
    // Unreadable right now: the next visit tries again.
  }
}

/** A name free in `folder`: "Title", "Title 2", "Title 3"… */
function freeName(folder, base, ext = "") {
  const node = folders.get(folder);
  const taken = new Set([...(node?.notes ?? []), ...(node?.folders ?? [])].map((p) => baseOf(p).toLowerCase()));
  if (!folder) taken.add(TRASH.toLowerCase());
  let name = `${base}${ext}`;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} ${n}${ext}`;
  return name;
}

/** Whether `name` is free in `folder` (another case of the same name is the same file to some file systems). */
const isFree = (folder, name) => freeName(folder, name.replace(/\.md$/i, ""), /\.md$/i.test(name) ? ".md" : "") === name;

async function attempt(job) {
  try {
    return await job();
  } catch (err) {
    toast(t("plugin.notes.error", { message: err.message }), "ko");
    await refresh();
    return undefined;
  }
}

/** Opens the tree on `folder` (its ancestors too). */
function unfold(folder) {
  prefs.collapsed = prefs.collapsed.filter((p) => !isInside(folder, p));
}

async function createNote({ folder = prefs.folder, title = "", content = "", focus = "title" } = {}) {
  if (!folders.has(folder)) folder = "";
  const path = joinPath(folder, freeName(folder, cleanName(title) || t("plugin.notes.note.untitled"), ".md"));
  return attempt(async () => {
    await share.write(full(path), content);
    if (query) clearSearch();
    unfold(folder);
    prefs.folder = folder;
    await refresh();
    await openNote(path, { focus });
    return path;
  });
}

async function createFolder(parent = prefs.folder) {
  if (!folders.has(parent)) parent = "";
  const typed = await core.prompt({
    title: parent ? t("plugin.notes.folder.newIn", { name: baseOf(parent) }) : t("plugin.notes.folder.newTitle"),
    okLabel: t("plugin.notes.create"),
    input: { placeholder: t("plugin.notes.folder.placeholder"), maxLength: 100 },
  });
  const name = cleanName(typed);
  if (!name) return;
  if (!isFree(parent, name)) return toast(t("plugin.notes.exists", { name }), "ko");
  const path = joinPath(parent, name);
  await attempt(async () => {
    await share.mkdir(full(path));
    if (query) clearSearch();
    unfold(path);
    prefs.folder = path;
    savePrefs();
    await refresh();
    renderWhere();
    flashRow("folder", path);
  });
}

/** Everything that names `from` now names `to`: the pins, the note open, the folder shown, the folded folders. */
function follow(from, to) {
  meta.pinned = meta.pinned.map((p) => rebase(p, from, to));
  prefs.collapsed = prefs.collapsed.map((p) => rebase(p, from, to));
  prefs.folder = rebase(prefs.folder, from, to);
  if (prefs.note) prefs.note = rebase(prefs.note, from, to);
  if (current) current.path = rebase(current.path, from, to);
  for (const [path, known] of [...contents]) {
    const next = rebase(path, from, to);
    if (next === path) continue;
    contents.delete(path);
    contents.set(next, known);
  }
  savePrefs();
}

/** Moves a note or a folder inside the notepad; what is typed is written first, at the old path. */
async function relocate(from, to) {
  const note = current && isInside(current.path, from) ? current : null;
  const move = async () => {
    await share.move(full(from), full(to));
    const pinned = meta.pinned.some((p) => isInside(p, from));
    follow(from, to);
    if (pinned) await saveMeta();
  };
  if (note) {
    await save(note);
    // On the note's own chain: a save asked meanwhile waits for the new path.
    note.chain = note.chain.then(move);
    await note.chain.catch((err) => {
      note.chain = Promise.resolve();
      throw err;
    });
  } else await move();
}

/** Moves `path` into `folder` ("" the root); the tree opens on the destination and shows the row. */
async function moveTo(path, folder, kind) {
  if (parentOf(path) === folder || !folders.has(folder)) return;
  if (kind === "folder" && isInside(folder, path)) return;
  const name = baseOf(path);
  if (!isFree(folder, name)) return toast(t("plugin.notes.exists", { name: kind === "note" ? titleOf(name) : name }), "ko");
  const to = joinPath(folder, name);
  await attempt(async () => {
    await relocate(path, to);
    if (query) clearSearch();
    unfold(folder);
    if (kind === "folder") prefs.folder = to;
    else if (!current) prefs.folder = folder;
    await refresh();
    renderWhere();
    flashRow(kind, to);
    toast(t("plugin.notes.moved", { name: kind === "note" ? titleOf(name) : name, folder: folder ? baseOf(folder) : t("plugin.notes.root") }));
  });
}

/** The title typed above the note becomes the name of its file. */
async function renameCurrent() {
  const note = current;
  if (!note) return;
  const input = el("nt-title");
  const before = titleOf(note.path);
  const wanted = cleanName(input.value);
  if (!wanted || wanted === before) {
    input.value = before;
    return;
  }
  const folder = parentOf(note.path);
  if (wanted.toLowerCase() !== before.toLowerCase() && !isFree(folder, `${wanted}.md`)) {
    input.value = before;
    return toast(t("plugin.notes.exists", { name: wanted }), "ko");
  }
  await attempt(async () => {
    await relocate(note.path, joinPath(folder, `${wanted}.md`));
    await refresh();
  });
  if (current === note) input.value = titleOf(note.path);
}

async function renameFolder(path) {
  const before = baseOf(path);
  const typed = await core.prompt({
    title: t("plugin.notes.folder.renameTitle", { name: before }),
    okLabel: t("plugin.notes.rename"),
    input: { value: before, maxLength: 100 },
  });
  const name = cleanName(typed);
  if (!name || name === before) return;
  const parent = parentOf(path);
  if (name.toLowerCase() !== before.toLowerCase() && !isFree(parent, name)) return toast(t("plugin.notes.exists", { name }), "ko");
  await attempt(async () => {
    await relocate(path, joinPath(parent, name));
    await refresh();
    renderWhere();
  });
}

async function togglePin(path) {
  meta.pinned = isPinned(path) ? meta.pinned.filter((p) => p !== path) : [...meta.pinned.filter((p) => notes.has(p)), path];
  renderColumn();
  await saveMeta();
}

async function duplicateNote(path) {
  await attempt(async () => {
    const text = await textOf(path);
    const folder = parentOf(path);
    const copy = joinPath(folder, freeName(folder, titleOf(path), ".md"));
    await share.write(full(copy), text);
    unfold(folder);
    await refresh();
    await openNote(copy, { focus: "title" });
  });
}

async function copyText(path) {
  try {
    await navigator.clipboard.writeText(await textOf(path));
    toast(t("plugin.notes.note.copied"));
  } catch {
    toast(t("plugin.notes.note.copyFailed"), "ko");
  }
}

async function download(path) {
  if (current?.path === path) await flush();
  const link = document.createElement("a");
  link.href = share.url(full(path), true);
  link.download = baseOf(path);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/* ---- The bin -------------------------------------------------------------------- */

function renderTrash() {
  const list = el("nt-trash");
  if (!trash.length) return list.replaceChildren(h("p", "nt-trash-empty", t("plugin.notes.trash.none")));
  list.replaceChildren(
    ...trash.map((entry) => {
      const row = h("div", "nt-trash-row");
      row.setAttribute("role", "listitem");
      const info = meta.trash[entry.name];
      const text = h("div", "nt-trash-text");
      text.appendChild(h("span", "nt-trash-title", entry.type === "dir" ? entry.name : titleOf(entry.name)));
      const sub = h("span", "nt-trash-sub");
      sub.appendChild(h("span", "", t("plugin.notes.trash.deleted", { date: core.formatDateTime(info?.at ?? entry.modifiedAt) })));
      if (info?.from) sub.appendChild(h("span", "", folderLabel(info.from)));
      text.appendChild(sub);
      const restore = h("button", "secondary");
      restore.type = "button";
      restore.innerHTML = `${iconSvg("arrow-counter-clockwise")}<span>${core.escapeHtml(t("plugin.notes.trash.restore"))}</span>`;
      restore.addEventListener("click", () => void restoreEntry(entry));
      const erase = h("button", "danger");
      erase.type = "button";
      erase.innerHTML = `${iconSvg("trash")}<span>${core.escapeHtml(t("plugin.notes.trash.erase"))}</span>`;
      erase.addEventListener("click", () => void eraseEntry(entry));
      row.append(iconNode(entry.type === "dir" ? "folder" : "note"), text, restore, erase);
      return row;
    }),
  );
}

/** To the bin of the notepad, remembering where it was. */
async function toTrash(path) {
  const base = baseOf(path);
  const dot = /\.md$/i.test(base) ? base.lastIndexOf(".") : base.length;
  const taken = new Set(trash.map((entry) => entry.name.toLowerCase()));
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base.slice(0, dot)} (${n})${base.slice(dot)}`;
  if (current && isInside(current.path, path)) {
    await flush();
    closeNote();
  }
  await share.move(full(path), full(joinPath(TRASH, name)));
  meta.trash[name] = { from: parentOf(path), at: new Date().toISOString() };
  meta.pinned = meta.pinned.filter((p) => !isInside(p, path));
  if (isInside(prefs.folder, path)) prefs.folder = parentOf(path);
  await saveMeta();
}

async function trashNote(path) {
  await attempt(async () => {
    await toTrash(path);
    await refresh();
    toast(t("plugin.notes.trash.moved", { name: titleOf(path) }));
  });
}

async function trashFolder(path) {
  const count = countIn(path);
  const ok = await core.confirm({
    title: t("plugin.notes.folder.deleteTitle", { name: baseOf(path) }),
    text: count ? tn("plugin.notes.folder.deleteText", count) : t("plugin.notes.folder.deleteEmpty"),
    okLabel: t("plugin.notes.delete"),
    danger: true,
  });
  if (!ok) return;
  await attempt(async () => {
    await toTrash(path);
    await refresh();
    toast(t("plugin.notes.trash.moved", { name: baseOf(path) }));
  });
}

async function restoreEntry(entry) {
  await attempt(async () => {
    const from = meta.trash[entry.name]?.from ?? "";
    const folder = folders.has(from) ? from : "";
    const isNote = entry.type !== "dir";
    // Its name of before the bin: "Title (2).md" was "Title.md".
    const original = entry.name.replace(/ \(\d+\)(?=(\.md)?$)/i, "");
    const name = isNote ? freeName(folder, titleOf(original), ".md") : freeName(folder, original);
    const to = joinPath(folder, name);
    await share.move(full(joinPath(TRASH, entry.name)), full(to));
    delete meta.trash[entry.name];
    await saveMeta();
    unfold(folder);
    await refresh();
    flashRow(isNote ? "note" : "folder", to);
    toast(t("plugin.notes.trash.restored", { name: isNote ? titleOf(name) : name, folder: folder ? baseOf(folder) : t("plugin.notes.root") }));
  });
}

async function eraseEntry(entry) {
  const name = entry.type === "dir" ? entry.name : titleOf(entry.name);
  const ok = await core.confirm({
    title: t("plugin.notes.trash.eraseTitle", { name }),
    text: t("plugin.notes.trash.eraseText"),
    okLabel: t("plugin.notes.trash.erase"),
    danger: true,
  });
  if (!ok) return;
  await attempt(async () => {
    await share.remove(full(joinPath(TRASH, entry.name)));
    delete meta.trash[entry.name];
    await saveMeta();
    await refresh();
  });
}

async function emptyTrash() {
  if (!trash.length) return;
  const ok = await core.confirm({
    title: t("plugin.notes.trash.emptyTitle"),
    text: `${tn("plugin.notes.trash.emptyText", trash.length)} ${t("plugin.notes.trash.eraseText")}`,
    okLabel: t("plugin.notes.trash.empty"),
    danger: true,
  });
  if (!ok) return;
  await attempt(async () => {
    for (const entry of trash) await share.remove(full(joinPath(TRASH, entry.name)));
    meta.trash = {};
    await saveMeta();
    await refresh();
    toast(t("plugin.notes.trash.emptied"));
  });
}

/* ---- Tab ------------------------------------------------------------------------- */

let started = false;

async function activate() {
  const ready = Boolean(Allkin.capability("markdown-editor"));
  el("nt-missing").classList.toggle("hidden", ready);
  if (!ready) return;
  applyColumn();
  await refresh();
  if (started) return;
  started = true;
  // Back on the note left last time — on a phone the column comes first.
  if (!isPhone() && prefs.note && notes.has(prefs.note)) await openNote(prefs.note);
  else showNote();
  if (isPhone()) setPane("column");
}

function open() {
  core.openTab(null, KIND);
}

Allkin.registerTabKind(KIND, {
  panels: ["nt-view"],
  icon: TAB_ICON,
  label: () => t("plugin.notes.app.name"),
  meta: t("plugin.notes.app.meta"),
  tooltip: () => t("plugin.notes.app.tooltip"),
  activate: () => void activate(),
  leave: () => {
    closeMenu();
    void flush();
  },
  beforeClose: () => void flush(),
});

Allkin.provide("notes", {
  open,
  /** Writes a note and shows it; resolves with its path in the notepad. */
  create: async ({ title = "", content = "", folder = "" } = {}) => {
    open();
    await scan();
    return createNote({ folder, title, content: String(content ?? ""), focus: "text" });
  },
});

Allkin.registerApp({
  key: "notes",
  get name() {
    return t("plugin.notes.app.name");
  },
  get meta() {
    return t("plugin.notes.app.meta");
  },
  icon: TAB_ICON,
  open,
});

/* ---- Wiring ---------------------------------------------------------------------- */

fillIcons(el("nt-view"));
fillIcons(el("nt-move"));
fillIcons(el("nt-ask-modal"));
core.fillPageIcons?.(el("nt-view"));
bindHandle();

el("nt-new-note").addEventListener("click", () => void createNote());
el("nt-fold").addEventListener("click", toggleFolded);
el("nt-note-menu").addEventListener("click", (e) => current && openMenu(noteMenu(current.path), { anchor: e.currentTarget }));
el("nt-ask").addEventListener("click", () => void openAsk());
el("nt-empty-trash").addEventListener("click", () => void emptyTrash());
el("nt-search").addEventListener("input", (e) => onSearch(e.target.value));
el("nt-search").addEventListener("keydown", (e) => {
  if (e.key === "Escape" && e.target.value) {
    e.stopPropagation();
    clearSearch();
  }
});
el("nt-back").addEventListener("click", () => {
  void flush();
  setPane("column");
});

el("nt-title").addEventListener("change", () => void renameCurrent());
el("nt-title").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    editor?.focus("start");
  } else if (e.key === "Escape" && current) {
    e.target.value = titleOf(current.path);
    e.target.blur();
  }
});

// Ctrl/⌘ + S writes at once (the note saves itself, the habit stays);
// Ctrl/⌘ + ⇧ + L folds the column. Wherever the focus is, while the tab shows.
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || core.activeTab()?.kind !== KIND) return;
  const key = e.key.toLowerCase();
  if (key === "s") {
    e.preventDefault();
    void flush();
  } else if (key === "l" && e.shiftKey && !isPhone()) {
    e.preventDefault();
    toggleFolded();
  }
});

el("nt-missing-open").addEventListener("click", async () => {
  try {
    await core.openPluginPage("markdown-editor");
  } catch (err) {
    toast(t("plugin.notes.error", { message: err.message }), "ko");
  }
});

bindModal("nt-move", () => closeModal("nt-move"));
bindModal("nt-ask-modal", () => {
  closeModal("nt-ask-modal");
  asking = null;
});
el("nt-ask-form").addEventListener("submit", (e) => {
  e.preventDefault();
  void sendAsk();
});
el("nt-ask-scope").addEventListener("click", (e) => {
  const button = e.target.closest("button[data-scope]");
  if (!button || button.disabled || !asking) return;
  asking.scope = button.dataset.scope;
  renderAskScope();
});

document.addEventListener("mousedown", (e) => {
  if (!e.target.closest?.("#nt-menu")) closeMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});
document.addEventListener("selectionchange", trackSelection);
window.addEventListener("resize", closeMenu);
window.addEventListener("blur", closeMenu);

// Nothing typed is lost when the page goes away.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) void flush();
});
window.addEventListener("pagehide", () => void flush());
})();
