/// <reference path="../typings/browser.d.ts" />
'use strict';
interface JQuery {
   splitPane(): JSTree;
}
interface MousetrapStatic {
   pause(): void;
   unpause(): void;
   init(): void;
}
module psdtool {
   function getElementById(doc: Document, id: string): HTMLElement {
      const elem = doc.getElementById(id);
      if (!elem) {
         throw new Error('#' + id + ' not found');
      }
      return elem;
   }

   class ProgressDialog {
      private dialog: JQuery;
      private bar: HTMLElement;
      private text: Text;
      constructor(title: string, text: string) {
         this.bar = getElementById(document, 'progress-dialog-progress-bar');
         this.text = document.createTextNode('');

         const label = getElementById(document, 'progress-dialog-label');
         label.innerHTML = '';
         label.appendChild(document.createTextNode(title));

         const caption = getElementById(document, 'progress-dialog-progress-caption');
         caption.innerHTML = '';
         caption.appendChild(this.text);

         this.update(0, text);
         this.dialog = jQuery('#progress-dialog');
         if (!this.dialog.data('bs.modal')) {
            this.dialog.modal();
         } else {
            this.dialog.modal('show');
         }
      }
      public close() {
         this.dialog.modal('hide');
      }
      public update(progress: number, text: string): void {
         const p = Math.min(100, Math.max(0, progress * 100));
         this.bar.style.width = p + '%';
         this.bar.setAttribute('aria-valuenow', p.toFixed(0) + '%');
         this.text.data = p.toFixed(0) + '% ' + text;
      }
   }
   class FilterDialog {
      public onUpdate: (id: string, type: string, data: string) => void;

      private root: LayerTree.Filter;
      private node: Favorite.Node;
      private useFilter: HTMLInputElement;
      private treeRoot: HTMLUListElement;
      private dialog: HTMLDivElement;

      constructor(private favorite: Favorite.Favorite) { }

      private init(): void {
         {
            const filterTree = getElementById(document, 'filter-tree');
            if (filterTree instanceof HTMLUListElement) {
               this.treeRoot = filterTree;
            } else {
               throw new Error('#filter-tree is not an UL element');
            }
         }
         this.treeRoot.innerHTML = '';
         this.treeRoot.addEventListener('click', e => {
            const inp = e.target;
            if (inp instanceof HTMLInputElement) {
               let li = inp.parentElement;
               while (!(li instanceof HTMLLIElement)) {
                  li = li.parentElement;
               }
               const checked = inp.checked;
               const inputs = li.querySelectorAll('input');
               for (let i = 0; i < inputs.length; ++i) {
                  const inp = inputs[i];
                  if (inp instanceof HTMLInputElement) {
                     inp.checked = checked;
                  }
               }
               if (checked) {
                  for (let parent = li.parentElement; parent !== this.treeRoot; parent = parent.parentElement) {
                     if (parent instanceof HTMLLIElement) {
                        const inp = parent.querySelector('input');
                        if (inp instanceof HTMLInputElement) {
                           inp.checked = true;
                        }
                     }
                  }
               }
               this.updateClass();
               this.update();
            }
         }, false);
         {
            const useFilter = getElementById(document, 'use-filter');
            if (useFilter instanceof HTMLInputElement) {
               this.useFilter = useFilter;
            } else {
               throw new Error('#filter-tree is not an INPUT element');
            }
         }
         this.useFilter.addEventListener('click', e => {
            this.updateClass();
            this.update();
         }, false);

         {
            const dialog = getElementById(document, 'filter-dialog');
            if (dialog instanceof HTMLDivElement) {
               this.dialog = dialog;
            } else {
               throw new Error('#filter-dialog is not an DIV element');
            }
         }
         jQuery(this.dialog).on('shown.bs.modal', e => {
            const filters = this.favorite.getAncestorFilters(this.node);
            if (this.node.type === 'filter') {
               this.useFilter.checked = true;
               this.root.deserialize(this.node.data ? this.node.data.value : '', filters);
            } else {
               this.useFilter.checked = false;
               this.root.deserialize('', filters);
            }
            this.updateClass();
         });
      }

      public load(psd: psd.Root): void {
         if (!this.treeRoot) {
            this.init();
         }
         this.root = new LayerTree.Filter(this.treeRoot, psd);
      }

      private updateClass(): void {
         if (this.useFilter.checked) {
            this.treeRoot.classList.remove('disabled');
         } else {
            this.treeRoot.classList.add('disabled');
         }

         const inputs = this.treeRoot.querySelectorAll('input');
         for (let i = 0, elem: Element, li: HTMLElement; i < inputs.length; ++i) {
            elem = inputs[i];
            if (elem instanceof HTMLInputElement) {
               li = elem.parentElement;
               while (li && li.tagName !== 'LI') {
                  li = li.parentElement;
               }
               if (elem.disabled) {
                  li.classList.add('disabled');
               } else {
                  li.classList.remove('disabled');
               }
               if (elem.checked) {
                  li.classList.add('checked');
               } else {
                  li.classList.remove('checked');
               }
            }
         }
      }

      private update(): void {
         if (this.useFilter.checked) {
            const s = this.root.serialize();
            if (s) {
               if (this.onUpdate) {
                  this.onUpdate(this.node.id || '', 'filter', s);
               }
               return;
            }
         }
         if (this.onUpdate) {
            this.onUpdate(this.node.id || '', 'folder', '');
         }
      }

      public show(n: Favorite.Node): void {
         this.node = n;
         let dialog = jQuery(this.dialog);
         if (!dialog.data('bs.modal')) {
            dialog.modal();
         } else {
            dialog.modal('show');
         }
      }
   }
   class FaviewSettingDialog {
      public onUpdate: () => void;
      private faviewMode: HTMLSelectElement;
      private dialog: HTMLDivElement;

      constructor(private favorite: Favorite.Favorite) {
         {
            const faviewMode = getElementById(document, 'faview-mode');
            if (faviewMode instanceof HTMLSelectElement) {
               this.faviewMode = faviewMode;
            } else {
               throw new Error('#faview-mode is not a SELECT element');
            }
         }
         this.faviewMode.addEventListener('change', e => this.update());

         {
            const dialog = getElementById(document, 'faview-setting-dialog');
            if (dialog instanceof HTMLDivElement) {
               this.dialog = dialog;
            } else {
               throw new Error('#faview-setting-dialog is not an DIV element');
            }
         }
         jQuery(this.dialog).on('shown.bs.modal', e => {
            this.faviewMode.selectedIndex = this.favorite.faviewMode;
         });
      }

      private update(): void {
         this.favorite.faviewMode = this.faviewMode.selectedIndex;
         if (this.onUpdate) {
            this.onUpdate();
         }
      }
   }
   export class Main {
      private optionAutoTrim: HTMLInputElement;
      private optionSafeMode: HTMLInputElement;

      private sideBody: HTMLElement;
      private sideBodyScrollPos: { [name: string]: { left: number; top: number } } = {};

      private previewCanvas: HTMLCanvasElement;
      private previewBackground: HTMLElement;

      private flipX: HTMLInputElement;
      private flipY: HTMLInputElement;
      private fixedSide: HTMLSelectElement;
      private maxPixels: HTMLInputElement;
      private seqDlPrefix: HTMLInputElement;
      private seqDlNum: HTMLInputElement;
      private seqDl: HTMLButtonElement;

      private bulkCreateFolderTextarea: HTMLTextAreaElement;
      private bulkRenameData: Favorite.RenameNode[];
      private lastCheckedNode: LayerTree.Node;

      private psdRoot: psd.Root;
      private favorite: Favorite.Favorite;
      private droppedPFV: File;

      private filterDialog: FilterDialog;

      public init() {
         Main.initDropZone('dropzone', files => {
            let i: number, ext: string;
            for (i = 0; i < files.length; ++i) {
               ext = files[i].name.substring(files[i].name.length - 4).toLowerCase();
               if (ext === '.pfv') {
                  this.droppedPFV = files[i];
                  break;
               }
            }
            for (i = 0; i < files.length; ++i) {
               ext = files[i].name.substring(files[i].name.length - 4).toLowerCase();
               if (ext !== '.pfv') {
                  this.loadAndParse(files[i]);
                  return;
               }
            }
         });
         this.initUI();
         getElementById(document, 'samplefile').addEventListener('click', e =>
            this.loadAndParse(getElementById(document, 'samplefile').getAttribute('data-filename')), false);
         window.addEventListener('resize', e => this.resized(), false);
         window.addEventListener('hashchange', e => this.hashchanged(), false);
         this.hashchanged();

         const elems = document.querySelectorAll('.psdtool-loading');
         for (let i = 0; i < elems.length; ++i) {
            elems[i].classList.add('psdtool-loaded');
            elems[i].classList.remove('psdtool-loading');
         }
      }

      private hashchanged() {
         const hashData = decodeURIComponent(location.hash.substring(1));
         if (hashData.substring(0, 5) === 'load:') {
            this.loadAndParse(hashData.substring(5));
         }
      }

      private resized() {
         const mainContainer = getElementById(document, 'main-container');
         const miscUi = getElementById(document, 'misc-ui');
         const previewContainer = getElementById(document, 'preview-container');
         let old = previewContainer.style.display;
         previewContainer.style.display = 'none';
         previewContainer.style.width = mainContainer.clientWidth + 'px';
         previewContainer.style.height = (mainContainer.clientHeight - miscUi.offsetHeight) + 'px';
         previewContainer.style.display = old;

         const sideContainer = getElementById(document, 'side-container');
         const sideHead = getElementById(document, 'side-head');
         const sideBody = getElementById(document, 'side-body');
         old = sideBody.style.display;
         sideBody.style.display = 'none';
         sideBody.style.width = sideContainer.clientWidth + 'px';
         sideBody.style.height = (sideContainer.clientHeight - sideHead.offsetHeight) + 'px';
         sideBody.style.display = old;

         const toolbars = document.querySelectorAll('.psdtool-tab-toolbar');
         for (let i = 0; i < toolbars.length; ++i) {
            const elem = toolbars[i];
            if (elem instanceof HTMLElement) {
               let p = elem.parentElement;
               while (!p.classList.contains('psdtool-tab-pane') && p) {
                  p = p.parentElement;
               }
               if (p) {
                  p.style.paddingTop = elem.clientHeight + 'px';
               }
            }
         }
      }

      private loadAndParse(input: File | string) {
         const fileOpenUi = getElementById(document, 'file-open-ui');
         const errorReportUi = getElementById(document, 'error-report-ui');
         const main = getElementById(document, 'main');

         fileOpenUi.style.display = 'block';
         errorReportUi.style.display = 'none';
         main.style.display = 'none';
         Mousetrap.pause();

         const errorMessageContainer = getElementById(document, 'error-message');
         const errorMessage = document.createTextNode('');

         errorMessageContainer.innerHTML = '';
         errorMessageContainer.appendChild(errorMessage);

         const prog = new ProgressDialog('Loading...', 'Getting ready...');
         Main.loadAsBlob(p => prog.update(p, 'Receiving file...'), input)
            .then(
            (o: { buffer: ArrayBuffer | Blob, name: string; }) =>
               this.parse(p => prog.update(p, 'Loading file...'), o))
            .then(() => {
               prog.close();
               fileOpenUi.style.display = 'none';
               errorReportUi.style.display = 'none';
               main.style.display = 'block';
               Mousetrap.unpause();
               this.resized();
            }, e => {
               prog.close();
               fileOpenUi.style.display = 'block';
               errorReportUi.style.display = 'block';
               main.style.display = 'none';
               Mousetrap.pause();
               errorMessage.data = e.toString();
               console.error(e);
            });
      }

      private parse(progress: (progress: number) => void, obj: { buffer: ArrayBuffer | Blob, name: string }) {
         const deferred = m.deferred();
         PSD.parseWorker(
            obj.buffer,
            progress,
            psd => {
               try {
                  this.psdRoot = psd;
                  this.loadLayerTree(psd);
                  this.filterDialog.load(psd);
                  this.loadRenderer(psd);

                  this.maxPixels.value = (this.optionAutoTrim.checked ? this.renderer.Height : this.renderer.CanvasHeight).toString();
                  this.seqDlPrefix.value = obj.name;
                  this.seqDlNum.value = '0';

                  const readmeButtons = document.querySelectorAll('.psdtool-show-readme');
                  for (let i = 0, elem: Element; i < readmeButtons.length; ++i) {
                     elem = readmeButtons[i];
                     if (elem instanceof HTMLElement) {
                        if (psd.Readme !== '') {
                           elem.classList.remove('hidden');
                        } else {
                           elem.classList.add('hidden');
                        }
                     }
                  }
                  getElementById(document, 'readme').textContent = psd.Readme;

                  //  TODO: error handling
                  this.favorite.psdHash = psd.Hash;
                  if (this.droppedPFV) {
                     const fr = new FileReader();
                     fr.onload = () => {
                        this.favorite.loadFromArrayBuffer(fr.result);
                     };
                     fr.readAsArrayBuffer(this.droppedPFV);
                  } else {
                     const pfvData = this.favorite.getPFVFromLocalStorage(psd.Hash);
                     if (pfvData && pfvData.time / 1000 > psd.PFVModDate) {
                        this.favorite.loadFromString(pfvData.data, pfvData.id);
                     } else if (psd.PFV) {
                        this.favorite.loadFromString(psd.PFV);
                     }
                  }
                  this.redraw();
                  deferred.resolve(true);
               } catch (e) {
                  deferred.reject(e);
               }
            },
            error => deferred.reject(error)
         );
         return deferred.promise;
      }

      private pfvOnDrop(files: FileList): void {
         this.leaveReaderMode();
         let i: number, ext: string;
         for (i = 0; i < files.length; ++i) {
            ext = files[i].name.substring(files[i].name.length - 4).toLowerCase();
            if (ext === '.pfv') {
               // TODO: error handling
               const fr = new FileReader();
               fr.onload = e => {
                  if (this.favorite.loadFromArrayBuffer(fr.result)) {
                     jQuery('#import-dialog').modal('hide');
                  }
               };
               fr.readAsArrayBuffer(files[i]);
               return;
            }
         }
      }

      private initFavoriteUI(): void {
         this.favorite = new Favorite.Favorite(
            getElementById(document, 'favorite-tree'),
            getElementById(document, 'favorite-tree').getAttribute('data-root-name'));
         this.favorite.onModified = () => {
            this.needRefreshFaview = true;
         };
         this.favorite.onLoaded = () => {
            this.startFaview();
            switch (this.favorite.faviewMode) {
               case Favorite.FaviewMode.ShowLayerTree:
                  this.toggleTreeFaview(false);
                  break;
               case Favorite.FaviewMode.ShowFaview:
                  if (!this.faview.closed) {
                     this.toggleTreeFaview(true);
                  }
                  break;
               case Favorite.FaviewMode.ShowFaviewAndReadme:
                  if (!this.faview.closed) {
                     this.toggleTreeFaview(true);
                     if (this.psdRoot.Readme !== '') {
                        jQuery('#readme-dialog').modal('show');
                     }
                  }
                  break;
            }
         };
         this.favorite.onClearSelection = () => this.leaveReaderMode();
         this.favorite.onSelect = (item: Favorite.Node) => {
            if (item.type !== 'item') {
               this.leaveReaderMode();
               return;
            }
            try {
               this.enterReaderMode(
                  item.data.value,
                  this.favorite.getFirstFilter(item),
                  item.text + '.png');
            } catch (e) {
               console.error(e);
               alert(e);
            }
         };
         this.favorite.onDoubleClick = (item: Favorite.Node): void => {
            try {
               switch (item.type) {
                  case 'item':
                     this.leaveReaderMode(item.data.value, this.favorite.getFirstFilter(item));
                     break;
                  case 'folder':
                  case 'filter':
                     this.filterDialog.show(item);
                     break;
               }
            } catch (e) {
               console.error(e);
               alert(e);
            }
         };

         this.filterDialog = new FilterDialog(this.favorite);
         this.filterDialog.onUpdate = (id, type, data) => {
            this.favorite.update({ id, type, data: { value: data } });
            this.favorite.updateLocalStorage();
            this.needRefreshFaview = true;
         };

         jQuery('button[data-psdtool-tree-add-item]').on('click', e => {
            this.leaveReaderMode();
            this.favorite.add('item', true, '', this.layerRoot.serialize(false));
         });
         Mousetrap.bind('mod+b', e => {
            e.preventDefault();
            let text = this.lastCheckedNode ? this.lastCheckedNode.displayName : 'New Item';
            text = prompt(document.querySelector('button[data-psdtool-tree-add-item]').getAttribute('data-caption'), text);
            if (text === null) {
               return;
            }
            this.leaveReaderMode();
            this.favorite.add('item', false, text, this.layerRoot.serialize(false));
         });

         jQuery('button[data-psdtool-tree-add-folder]').on('click', e => {
            this.favorite.add('folder', true);
         });
         Mousetrap.bind('mod+d', e => {
            e.preventDefault();
            let text = prompt(document.querySelector('button[data-psdtool-tree-add-folder]').getAttribute('data-caption'), 'New Folder');
            if (text === null) {
               return;
            }
            this.favorite.clearSelection();
            this.favorite.add('folder', false, text);
         });

         jQuery('button[data-psdtool-tree-rename]').on('click', e => this.favorite.edit());
         Mousetrap.bind('f2', e => {
            e.preventDefault();
            this.favorite.edit();
         });

         jQuery('button[data-psdtool-tree-remove]').on('click', e => this.favorite.remove());

         Mousetrap.bind('shift+mod+g', e => {
            const target = e.target;
            if (target instanceof HTMLElement && target.classList.contains('psdtool-layer-visible')) {
               e.preventDefault();
               if (!target.classList.contains('psdtool-layer-radio')) {
                  return;
               }
               if (target instanceof HTMLInputElement) {
                  const old = this.layerRoot.serialize(true);
                  const created: string[] = [];
                  let n: LayerTree.Node;
                  const elems = document.querySelectorAll('input[name="' + target.name + '"].psdtool-layer-radio');
                  for (let i = 0; i < elems.length; ++i) {
                     n = this.layerRoot.nodes[parseInt(elems[i].getAttribute('data-seq'), 10)];
                     if (n.li.classList.contains('psdtool-item-flip-x') ||
                        n.li.classList.contains('psdtool-item-flip-y') ||
                        n.li.classList.contains('psdtool-item-flip-xy')) {
                        continue;
                     }
                     n.checked = true;
                     this.favorite.add('item', false, n.displayName, this.layerRoot.serialize(false));
                     created.push(n.displayName);
                  }
                  this.layerRoot.deserialize(old);
                  this.redraw();
                  alert(created.length + ' favorite item(s) has been added.\n\n' + created.join('\n'));
               }
            }
         });

         Main.initDropZone('pfv-dropzone', files => this.pfvOnDrop(files));
         Main.initDropZone('pfv-dropzone2', files => this.pfvOnDrop(files));
         jQuery('#import-dialog').on('shown.bs.modal', e => {
            // build the recent list
            const recents = getElementById(document, 'pfv-recents');
            recents.innerHTML = '';
            let btn: HTMLButtonElement;
            const pfvs = this.favorite.getPFVListFromLocalStorage();
            for (let i = pfvs.length - 1; i >= 0; --i) {
               btn = document.createElement('button');
               btn.type = 'button';
               btn.className = 'list-group-item';
               if (pfvs[i].hash === this.psdRoot.Hash) {
                  btn.className += ' list-group-item-info';
               }
               btn.setAttribute('data-dismiss', 'modal');
               ((btn: HTMLButtonElement, data: string, uniqueId: string) => {
                  btn.addEventListener('click', e => {
                     this.leaveReaderMode();
                     // TODO: error handling
                     this.favorite.loadFromString(data, uniqueId);
                  }, false);
               })(btn, pfvs[i].data, pfvs[i].id);
               btn.appendChild(document.createTextNode(
                  Favorite.countEntries(pfvs[i].data) +
                  ' item(s) / Created at ' +
                  Main.formateDate(new Date(pfvs[i].time))
               ));
               recents.appendChild(btn);
            }
         });

         jQuery('#bulk-create-folder-dialog').on('shown.bs.modal', e => this.bulkCreateFolderTextarea.focus());
         const e = getElementById(document, 'bulk-create-folder-textarea');
         if (e instanceof HTMLTextAreaElement) {
            this.bulkCreateFolderTextarea = e;
         } else {
            throw new Error('element not found: #bulk-create-folder-textarea');
         }
         getElementById(document, 'bulk-create-folder').addEventListener('click', e => {
            const folders: string[] = [];
            for (let line of this.bulkCreateFolderTextarea.value.replace(/\r/g, '').split('\n')) {
               line = line.trim();
               if (line === '') {
                  continue;
               }
               folders.push(line);
            }
            this.favorite.addFolders(folders);
            this.bulkCreateFolderTextarea.value = '';
         }, false);

         jQuery('#bulk-rename-dialog').on('shown.bs.modal', e => {
            let r = (ul: HTMLElement, nodes: Favorite.RenameNode[]): void => {
               let cul: HTMLUListElement;
               let li: HTMLLIElement;
               let input: HTMLInputElement;
               for (let n of nodes) {
                  input = document.createElement('input');
                  input.className = 'form-control';
                  input.value = n.text;
                  ((input: HTMLInputElement, n: Favorite.RenameNode) => {
                     input.onblur = e => { n.text = input.value.trim(); };
                  })(input, n);
                  li = document.createElement('li');
                  li.appendChild(input);
                  cul = document.createElement('ul');
                  li.appendChild(cul);
                  r(cul, n.children);
                  ul.appendChild(li);
               }
            };
            const elem = getElementById(document, 'bulk-rename-tree');
            this.bulkRenameData = this.favorite.renameNodes;
            elem.innerHTML = '';
            r(elem, this.bulkRenameData);
         });
         getElementById(document, 'bulk-rename').addEventListener('click', e => {
            // auto numbering
            let digits = 1;
            {
               const elem = getElementById(document, 'rename-digits');
               if (elem instanceof HTMLSelectElement) {
                  digits = parseInt(elem.value, 10);
               }
            }
            let n = 0;
            {
               const elem = getElementById(document, 'rename-start-number');
               if (elem instanceof HTMLInputElement) {
                  n = parseInt(elem.value, 10);
               }
            }
            const elems = getElementById(document, 'bulk-rename-tree').querySelectorAll('input');
            for (let i = 0; i < elems.length; ++i) {
               const elem = elems[i];
               if (elem instanceof HTMLInputElement && elem.value === '') {
                  elem.value = ('0000' + n.toString()).slice(-digits);
                  elem.onblur(null);
                  ++n;
               }
            }
            this.favorite.bulkRename(this.bulkRenameData);
         }, false);

         getElementById(document, 'export-favorites-pfv').addEventListener('click', e => {
            saveAs(new Blob([this.favorite.pfv], {
               type: 'text/plain'
            }), Main.cleanForFilename(this.favorite.rootName) + '.pfv');
         }, false);
         getElementById(document, 'export-favorites-zip').addEventListener('click', e => {
            this.exportZIP(false);
         }, false);
         getElementById(document, 'export-favorites-zip-filter-solo').addEventListener('click', e => {
            this.exportZIP(true);
         }, false);
         const faviewExports = document.querySelectorAll('[data-export-faview]');
         for (let i = 0; i < faviewExports.length; ++i) {
            ((elem: Element): void => {
               elem.addEventListener('click', e => {
                  if (elem.getAttribute('data-format') === 'zip') {
                     this.exportFaview(
                        elem.getAttribute('data-export-faview') === 'standard',
                        elem.getAttribute('data-structure') === 'flat'
                     );
                  } else {
                     this.exportFaviewTiled(
                        elem.getAttribute('data-export-faview') === 'standard',
                        elem.getAttribute('data-structure') === 'flat'
                     );
                  }
               });
            })(faviewExports[i]);
         }
         getElementById(document, 'export-layer-structure').addEventListener('click', e => {
            saveAs(new Blob([this.layerRoot.text], {
               type: 'text/plain'
            }), 'layer.txt');
         }, false);

         const faviewToggleButtons = document.querySelectorAll('.psdtool-toggle-tree-faview');
         for (let i = 0; i < faviewToggleButtons.length; ++i) {
            faviewToggleButtons[i].addEventListener('click', e => this.toggleTreeFaview(), false);
         }

         this.faviewSettingDialog = new FaviewSettingDialog(this.favorite);
         this.faviewSettingDialog.onUpdate = () => this.favorite.updateLocalStorage();
      }

      private toggleTreeFaview(forceActiveFaview?: boolean): void {
         const pane = getElementById(document, 'layer-tree-pane');
         if (forceActiveFaview === undefined) {
            forceActiveFaview = !pane.classList.contains('faview-active');
         }
         if (forceActiveFaview) {
            pane.classList.add('faview-active');
            this.faviewOnRootChanged();
         } else {
            pane.classList.remove('faview-active');
         }
      }

      private faviewSettingDialog: FaviewSettingDialog;
      private faview: Favorite.Faview;
      private needRefreshFaview: boolean;
      private startFaview(): void {
         this.resized();
         if (!this.faview) {
            let rootSel: HTMLSelectElement;
            let root: HTMLUListElement;
            const elem = getElementById(document, 'faview-root-node');
            if (elem instanceof HTMLSelectElement) {
               rootSel = elem;
            } else {
               throw new Error('element not found: #faview-root-node');
            }
            elem = getElementById(document, 'faview-tree');
            if (elem instanceof HTMLUListElement) {
               root = elem;
            } else {
               throw new Error('element not found: #faview-tree');
            }
            this.faview = new Favorite.Faview(this.favorite, rootSel, root);
            this.faview.onRootChanged = () => this.faviewOnRootChanged();
            this.faview.onChange = node => this.faviewOnChange(node);
         }
         getElementById(document, 'layer-tree-toolbar').classList.remove('hidden');
         this.faview.start();
         this.needRefreshFaview = false;
         if (this.faview.roots === 0) {
            this.endFaview();
         } else {
            this.resized();
         }
      }

      private refreshFaview(): void {
         if (!this.faview || this.faview.closed) {
            this.startFaview();
         }
         if (!this.needRefreshFaview) {
            return;
         }
         this.faview.refresh();
         this.needRefreshFaview = false;
         if (this.faview.roots === 0) {
            this.endFaview();
         }
      }

      private faviewOnRootChanged(): void {
         this.leaveReaderMode();
         for (let n of this.faview.getActive()) {
            this.layerRoot.deserializePartial(
               undefined, n.data.value, this.favorite.getFirstFilter(n));
         }
         this.redraw();
      }

      private faviewOnChange(node: Favorite.Node): void {
         this.leaveReaderMode(node.data.value, this.favorite.getFirstFilter(node));
      }

      private endFaview() {
         getElementById(document, 'layer-tree-toolbar').classList.add('hidden');
         this.toggleTreeFaview(false);
         this.resized();
         this.faview.close();
      }

      private exportZIP(filterSolo: boolean): void {
         const parents: Favorite.Node[] = [];
         const path: string[] = [],
            files: { name: string; value: string; filter?: string }[] = [];
         let r = (children: Favorite.Node[]) => {
            for (let item of children) {
               path.push(Main.cleanForFilename(item.text.replace(/^\*/, '')));
               switch (item.type) {
                  case 'root':
                     path.pop();
                     r(item.children);
                     path.push('');
                     break;
                  case 'folder':
                     parents.unshift(item);
                     r(item.children);
                     parents.shift();
                     break;
                  case 'filter':
                     parents.unshift(item);
                     r(item.children);
                     parents.shift();
                     break;
                  case 'item':
                     let filter: string;
                     for (let p of parents) {
                        if (p.type === 'filter') {
                           filter = p.data.value;
                           break;
                        }
                     }
                     if (filter) {
                        files.push({
                           name: path.join('\\') + '.png',
                           value: item.data.value,
                           filter: filter
                        });
                     } else {
                        files.push({
                           name: path.join('\\') + '.png',
                           value: item.data.value
                        });
                     }
                     break;
                  default:
                     throw new Error('unknown item type: ' + item.type);
               }
               path.pop();
            }
         };
         const json = this.favorite.json;
         r(json);

         const backup = this.layerRoot.serialize(true);
         const z = new Zipper.Zipper();

         const prog = new ProgressDialog('Exporting...', '');

         let aborted = false;
         const errorHandler = (readableMessage: string, err: any) => {
            z.dispose(err => undefined);
            console.error(err);
            if (!aborted) {
               alert(readableMessage + ': ' + err);
            }
            prog.close();
         };
         // it is needed to avoid alert storm when reload during exporting.
         window.addEventListener('unload', () => { aborted = true; }, false);

         let added = 0;
         const addedHandler = () => {
            if (++added < files.length + 1) {
               prog.update(
                  added / (files.length + 1),
                  added === 1 ? 'drawing...' : '(' + added + '/' + files.length + ') ' + files[added - 1].name);
               return;
            }
            this.layerRoot.deserialize(backup);
            prog.update(1, 'building a zip...');
            z.generate(blob => {
               prog.close();
               saveAs(blob, Main.cleanForFilename(this.favorite.rootName) + '.zip');
               z.dispose(err => undefined);
            }, e => errorHandler('cannot create a zip archive', e));
         };

         z.init(() => {
            z.add(
               'favorites.pfv',
               new Blob([this.favorite.pfv], { type: 'text/plain; charset=utf-8' }),
               addedHandler,
               e => errorHandler('cannot write pfv to a zip archive', e));

            let i = 0;
            const process = () => {
               if ('filter' in files[i]) {
                  this.layerRoot.deserializePartial(filterSolo ? '' : backup, files[i].value, files[i].filter);
               } else {
                  this.layerRoot.deserialize(files[i].value);
               }
               this.render((progress, canvas) => {
                  if (progress !== 1) {
                     return;
                  }
                  z.add(
                     files[i].name,
                     new Blob([Main.dataSchemeURIToArrayBuffer(canvas.toDataURL())], { type: 'image/png' }),
                     addedHandler,
                     e => errorHandler('cannot write png to a zip archive', e));
                  if (++i < files.length) {
                     setTimeout(process, 0);
                  }
               });
            };
            process();
         }, e => errorHandler('cannot create a zip archive', e));
      }

      private exportFaview(includeItemCaption: boolean, flatten: boolean): void {
         const z = new Zipper.Zipper();
         const prog = new ProgressDialog('Exporting...', '');

         let aborted = false;
         const errorHandler = (readableMessage: string, err: any) => {
            z.dispose(err => undefined);
            prog.close();
            console.error(err);
            if (!aborted) {
               alert(readableMessage + ': ' + err);
            }
         };
         // it is needed to avoid alert storm when reload during exporting.
         window.addEventListener('unload', () => { aborted = true; }, false);
         z.init(() => {
            this.enumerateFaview(
               (path: { caption: string, name: string }[], image: HTMLCanvasElement, progress: number, next: () => void) => {
                  const name = path.map((e, i) => {
                     return Main.cleanForFilename((i && includeItemCaption ? e.caption + '-' : '') + e.name);
                  }).join(flatten ? '_' : '\\') + '.png';
                  z.add(
                     name,
                     new Blob([Main.dataSchemeURIToArrayBuffer(image.toDataURL())], { type: 'image/png' }),
                     next,
                     e => errorHandler('cannot write png to a zip archive', e)
                  );
                  prog.update(progress, name);
               },
               () => {
                  prog.update(1, 'building a zip...');
                  z.generate(blob => {
                     saveAs(blob, 'simple-view.zip');
                     z.dispose(err => undefined);
                     prog.close();
                  }, e => errorHandler('cannot create a zip archive', e));
               }
            );
         }, e => errorHandler('cannot create a zip archive', e));
      }

      private exportFaviewTiled(includeItemCaption: boolean, flatten: boolean): void {
         const z = new tileder.Tileder();
         const prog = new ProgressDialog('Exporting...', '');

         let aborted = false;
         // const errorHandler = (readableMessage: string, err: any) => {
         //    z.dispose(err => undefined);
         //    prog.close();
         //    console.error(err);
         //    if (!aborted) {
         //       alert(readableMessage + ': ' + err);
         //    }
         // };
         // it is needed to avoid alert storm when reload during exporting.
         window.addEventListener('unload', () => { aborted = true; }, false);
         // z.init(() => {
            this.enumerateFaview(
               (path: { caption: string, name: string }[], image: HTMLCanvasElement, progress: number, next: () => void) => {
                  const name = path.map((e, i) => {
                     return Main.cleanForFilename((i && includeItemCaption ? e.caption + '-' : '') + e.name);
                  }).join(flatten ? '_' : '\\') + '.png';
                  z.add(name, image);
                  prog.update(progress, name);
                  next();
               },
               () => {
                  z.finish();
                  // prog.update(1, 'building a zip...');
                  // z.generate(blob => {
                  //    saveAs(blob, 'simple-view.zip');
                  //    z.dispose(err => undefined);
                  //    prog.close();
                  // }, e => errorHandler('cannot create a zip archive', e));
               }
            );
         // }, e => errorHandler('cannot create a zip archive', e));
      }

      private enumerateFaview(
         item: (path: { caption: string, name: string }[], image: HTMLCanvasElement, progress: number, next: () => void) => void,
         complete: () => void
      ): void {
         this.refreshFaview();
         const items = this.faview.items;
         let total = 0;
         for (let item of items) {
            if (!item.selects.length) {
               continue;
            }
            let n = 1;
            for (let select of item.selects) {
               n *= select.items.length;
            }
            total += n;
         }
         if (!total) {
            return;
         }

         const backup = this.layerRoot.serialize(true);
         let added = 0;
         let sels: Favorite.FaviewSelect[];
         const path: { caption: string, name: string }[] = [];
         let nextItemSet = (depth: number, index: number, complete: () => void): void => {
            const sel = sels[depth];
            const selItem = sel.items[index];
            path.push({ caption: sel.caption, name: selItem.name });
            const fav = this.favorite.get(selItem.value);
            this.layerRoot.deserializePartial(undefined, fav.data ? fav.data.value : '', this.favorite.getFirstFilter(fav));
            const nextItem = (): void => {
               path.pop();
               if (index < sel.items.length - 1) {
                  nextItemSet(depth, index + 1, complete);
               } else {
                  complete();
               }
            };
            if (depth < sels.length - 1) {
               if (sels[depth + 1].items.length) {
                  nextItemSet(depth + 1, 0, nextItem);
               } else {
                  nextItem();
               }
            } else {
               this.render((progress, canvas) => {
                  if (progress !== 1) {
                     return;
                  }
                  item(path, canvas, (++added) / total, nextItem);
               });
            }
         };
         let nextRoot = (index: number, complete: () => void): void => {
            const selItem = items[index];
            path.push({ caption: 'root', name: selItem.name });
            sels = selItem.selects;
            const nextRootItem = (): void => {
               path.pop();
               if (++index >= items.length) {
                  complete();
               } else {
                  nextRoot(index, complete);
               }
            };
            if (sels.length && sels[0].items.length) {
               nextItemSet(0, 0, nextRootItem);
            } else {
               nextRootItem();
            }
         };
         nextRoot(0, (): void => {
            this.layerRoot.deserialize(backup);
            complete();
         });
      }

      private initUI() {
         this.optionAutoTrim = Main.getInputElement('#option-auto-trim');
         this.optionSafeMode = Main.getInputElement('#option-safe-mode');

         // save and restore scroll position of side-body on each tab.
         const toolbars = document.querySelectorAll('.psdtool-tab-toolbar');
         this.sideBody = getElementById(document, 'side-body');
         this.sideBody.addEventListener('scroll', e => {
            const pos = this.sideBody.scrollTop + 'px';
            for (let i = 0; i < toolbars.length; ++i) {
               const elem = toolbars[i];
               if (elem instanceof HTMLElement) {
                  elem.style.top = pos;
               }
            }
         }, false);
         this.sideBodyScrollPos = {};
         jQuery('a[data-toggle="tab"]').on('hide.bs.tab', e => {
            const tab = e.target.getAttribute('href');
            this.sideBodyScrollPos[tab] = {
               left: this.sideBody.scrollLeft,
               top: this.sideBody.scrollTop
            };
         }).on('shown.bs.tab', e => {
            const tab = e.target.getAttribute('href');
            if (tab in this.sideBodyScrollPos) {
               this.sideBody.scrollLeft = this.sideBodyScrollPos[tab].left;
               this.sideBody.scrollTop = this.sideBodyScrollPos[tab].top;
            }
            this.resized();
         });
         jQuery('a[data-toggle="tab"][href="#layer-tree-pane"]').on('show.bs.tab', e => {
            this.leaveReaderMode();
            this.refreshFaview();
         });

         this.initFavoriteUI();

         this.previewBackground = getElementById(document, 'preview-background');
         const elem = getElementById(document, 'preview');
         if (elem instanceof HTMLCanvasElement) {
            this.previewCanvas = elem;
         } else {
            throw new Error('element not found: #preview');
         }
         this.previewCanvas.addEventListener('dragstart', e => {
            let s = this.previewCanvas.toDataURL();
            const name = this.previewCanvas.getAttribute('data-filename');
            if (name) {
               const p = s.indexOf(';');
               s = s.substring(0, p) + ';filename=' + encodeURIComponent(name) + s.substring(p);
            }
            e.dataTransfer.setData('text/uri-list', s);
            e.dataTransfer.setData('text/plain', s);
         }, false);

         jQuery('#main').on('splitpaneresize', e => this.resized()).splitPane();

         elem = getElementById(document, 'flip-x');
         if (elem instanceof HTMLInputElement) {
            this.flipX = elem;
         }
         jQuery(this.flipX).on('change', e => this.redraw());

         elem = getElementById(document, 'flip-y');
         if (elem instanceof HTMLInputElement) {
            this.flipY = elem;
         }
         jQuery(this.flipY).on('change', e => this.redraw());

         elem = getElementById(document, 'fixed-side');
         if (elem instanceof HTMLSelectElement) {
            this.fixedSide = elem;
         } else {
            throw new Error('element not found: #fixed-side');
         }
         this.fixedSide.addEventListener('change', e => this.redraw(), false);

         let lastPx: string;
         this.maxPixels = Main.getInputElement('#max-pixels');
         this.maxPixels.addEventListener('blur', e => {
            const v = Main.normalizeNumber(this.maxPixels.value);
            if (v === lastPx) {
               return;
            }
            lastPx = v;
            this.maxPixels.value = v;
            this.redraw();
         }, false);

         this.seqDlPrefix = Main.getInputElement('#seq-dl-prefix');
         this.seqDlNum = Main.getInputElement('#seq-dl-num');
         elem = getElementById(document, 'seq-dl');
         if (elem instanceof HTMLButtonElement) {
            this.seqDl = elem;
         } else {
            throw new Error('element not found: #seq-dl');
         }
         this.seqDl.addEventListener('click', e => {
            const prefix = this.seqDlPrefix.value;
            if (this.seqDlNum.value === '') {
               this.save(prefix + '.png');
               return;
            }

            let num = parseInt(Main.normalizeNumber(this.seqDlNum.value), 10);
            if (num < 0) {
               num = 0;
            }
            this.save(prefix + ('0000' + num).slice(-4) + '.png');
            this.seqDlNum.value = (num + 1).toString();
         }, false);

         Mousetrap.pause();
      }

      private redraw(): void {
         this.seqDl.disabled = true;
         this.render((progress, canvas) => {
            this.previewBackground.style.width = canvas.width + 'px';
            this.previewBackground.style.height = canvas.height + 'px';
            this.seqDl.disabled = progress !== 1;
            this.previewCanvas.draggable = progress === 1;
            setTimeout(() => {
               this.previewCanvas.width = canvas.width;
               this.previewCanvas.height = canvas.height;
               this.previewCanvas.getContext('2d').drawImage(canvas, 0, 0);
            }, 0);
         });
         this.layerRoot.updateClass();
      }

      private save(filename: string): void {
         saveAs(new Blob([
            Main.dataSchemeURIToArrayBuffer(this.previewCanvas.toDataURL())
         ], { type: 'image/png' }), filename);
      }

      // renderer --------------------------------

      private renderer: Renderer.Renderer;
      private loadRenderer(psd: psd.Root): void {
         this.renderer = new Renderer.Renderer(psd);
         const lNodes = this.layerRoot.nodes;
         const rNodes = this.renderer.nodes;
         for (let key in rNodes) {
            if (!rNodes.hasOwnProperty(key)) {
               continue;
            }
            ((r: Renderer.Node, l: LayerTree.Node) => {
               r.getVisibleState = () => l.checked;
            })(rNodes[key], lNodes[key]);
         }
      }

      private render(callback: (progress: number, canvas: HTMLCanvasElement) => void): void {
         const autoTrim = this.optionAutoTrim.checked;
         const w = autoTrim ? this.renderer.Width : this.renderer.CanvasWidth;
         const h = autoTrim ? this.renderer.Height : this.renderer.CanvasHeight;
         const px = parseInt(this.maxPixels.value, 10);
         let scale = 1;
         switch (this.fixedSide.value) {
            case 'w':
               if (w > px) {
                  scale = px / w;
               }
               break;
            case 'h':
               if (h > px) {
                  scale = px / h;
               }
               break;
         }
         if (w * scale < 1 || h * scale < 1) {
            if (w > h) {
               scale = 1 / h;
            } else {
               scale = 1 / w;
            }
         }
         let ltf: LayerTree.FlipType;
         let rf: Renderer.FlipType;
         if (this.flipX.checked) {
            if (this.flipY.checked) {
               ltf = LayerTree.FlipType.FlipXY;
               rf = Renderer.FlipType.FlipXY;
            } else {
               ltf = LayerTree.FlipType.FlipX;
               rf = Renderer.FlipType.FlipX;
            }
         } else {
            if (this.flipY.checked) {
               ltf = LayerTree.FlipType.FlipY;
               rf = Renderer.FlipType.FlipY;
            } else {
               ltf = LayerTree.FlipType.NoFlip;
               rf = Renderer.FlipType.NoFlip;
            }
         }
         if (this.layerRoot.flip !== ltf) {
            this.layerRoot.flip = ltf;
         }
         this.renderer.render(scale, autoTrim, rf, callback);
      }

      // layerTree --------------------------------

      private layerRoot: LayerTree.LayerTree;
      private layerTree: HTMLUListElement;
      private initLayerTree(): void {
         {
            const layerTree = getElementById(document, 'layer-tree');
            if (layerTree instanceof HTMLUListElement) {
               this.layerTree = layerTree;
            } else {
               throw new Error('#layer-tree is not an UL element');
            }
         }
         this.layerTree.innerHTML = '';
         this.layerTree.addEventListener('click', e => {
            const target = e.target;
            if (target instanceof HTMLInputElement && target.classList.contains('psdtool-layer-visible')) {
               const n = this.layerRoot.nodes[parseInt(target.getAttribute('data-seq') || '0', 10)];
               if (target.checked) {
                  this.lastCheckedNode = n;
               }
               for (let p = n.parent; !p.isRoot; p = p.parent) {
                  p.checked = true;
               }
               if (n.clippedBy) {
                  n.clippedBy.checked = true;
               }
               this.redraw();
            }
         }, false);
      }

      private loadLayerTree(psd: psd.Root): void {
         if (!this.layerTree) {
            this.initLayerTree();
         }
         this.layerRoot = new LayerTree.LayerTree(this.optionSafeMode.checked, this.layerTree, psd);
      }

      // preview mode --------------------------------

      private normalModeState: string;
      private enterReaderMode(state: string, filter?: string, filename?: string): void {
         if (!this.previewBackground.classList.contains('reader')) {
            this.previewBackground.classList.add('reader');
            this.normalModeState = this.layerRoot.serialize(true);
         }
         if (!filter) {
            this.layerRoot.deserialize(state);
         } else {
            this.layerRoot.deserializePartial(this.normalModeState, state, filter);
         }
         if (filename) {
            this.previewCanvas.setAttribute('data-filename', filename);
         }
         this.redraw();
      }

      private leaveReaderMode(state?: string, filter?: string): void {
         if (this.previewBackground.classList.contains('reader')) {
            this.previewBackground.classList.remove('reader');
         }
         if (state) {
            this.previewCanvas.removeAttribute('data-filename');
            if (!filter) {
               this.layerRoot.deserialize(state);
            } else {
               if (this.normalModeState) {
                  this.layerRoot.deserializePartial(this.normalModeState, state, filter);
               } else {
                  this.layerRoot.deserializePartial(undefined, state, filter);
               }
            }
         } else if (this.normalModeState) {
            this.previewCanvas.removeAttribute('data-filename');
            this.layerRoot.deserialize(this.normalModeState);
         } else {
            return;
         }
         this.redraw();
         this.normalModeState = null;
      }

      // static --------------------------------

      private static getInputElement(query: string): HTMLInputElement {
         const elem = document.querySelector(query);
         if (elem instanceof HTMLInputElement) {
            return elem;
         }
         throw new Error('element not found ' + query);
      }

      private static cleanForFilename(f: string): string {
         return f.replace(/[\x00-\x1f\x22\x2a\x2f\x3a\x3c\x3e\x3f\x7c\x7f]+/g, '_');
      }

      private static formateDate(d: Date): string {
         let s = d.getFullYear() + '-';
         s += ('0' + (d.getMonth() + 1)).slice(-2) + '-';
         s += ('0' + d.getDate()).slice(-2) + ' ';
         s += ('0' + d.getHours()).slice(-2) + ':';
         s += ('0' + d.getMinutes()).slice(-2) + ':';
         s += ('0' + d.getSeconds()).slice(-2);
         return s;
      }

      private static extractFilePrefixFromUrl(url: string): string {
         url = url.replace(/#[^#]*$/, '');
         url = url.replace(/\?[^?]*$/, '');
         url = url.replace(/^.*?([^\/]+)$/, '$1');
         url = url.replace(/\..*$/i, '') + '_';
         return url;
      }

      private static initDropZone(dropZoneId: string, loader: (files: FileList) => void): void {
         const dz = getElementById(document, dropZoneId);
         dz.addEventListener('dragenter', e => {
            dz.classList.add('psdtool-drop-active');
            e.preventDefault();
            e.stopPropagation();
            return false;
         }, false);
         dz.addEventListener('dragover', e => {
            dz.classList.add('psdtool-drop-active');
            e.preventDefault();
            e.stopPropagation();
            return false;
         }, false);
         dz.addEventListener('dragleave', e => {
            dz.classList.remove('psdtool-drop-active');
            e.preventDefault();
            e.stopPropagation();
            return false;
         }, false);
         dz.addEventListener('drop', e => {
            dz.classList.remove('psdtool-drop-active');
            if (e.dataTransfer.files.length > 0) {
               loader(e.dataTransfer.files);
            }
            e.preventDefault();
            e.stopPropagation();
            return false;
         }, false);
         const f = dz.querySelector('input[type=file]');
         if (f instanceof HTMLInputElement) {
            const file = f;
            f.addEventListener('change', e => {
               loader(file.files);
               file.value = null;
            }, false);
         }
      }

      private static dataSchemeURIToArrayBuffer(str: string): ArrayBuffer {
         const bin = atob(str.substring(str.indexOf(',') + 1));
         const buf = new Uint8Array(bin.length);
         for (let i = 0; i < bin.length; ++i) {
            buf[i] = bin.charCodeAt(i);
         }
         return buf.buffer;
      }

      private static normalizeNumber(s: string): string {
         return s.replace(/[\uff10-\uff19]/g, (m): string => {
            return (m[0].charCodeAt(0) - 0xff10).toString();
         });
      }

      private static loadAsBlobCrossDomain(progress: (progress: number) => void, url: string) {
         const deferred = m.deferred();
         if (location.protocol === 'https:' && url.substring(0, 5) === 'http:') {
            setTimeout((): void => deferred.reject(new Error('cannot access to the insecure content from HTTPS.')), 0);
            return deferred.promise;
         }
         const ifr = document.createElement('iframe');
         let port: MessagePort;
         let timer = setTimeout(() => {
            port.onmessage = null;
            document.body.removeChild(ifr);
            deferred.reject(new Error('something went wrong'));
         }, 20000);
         ifr.setAttribute('sandbox', 'allow-scripts allow-same-origin');
         ifr.onload = e => {
            const msgCh = new MessageChannel();
            port = msgCh.port1;
            port.onmessage = e => {
               if (timer) {
                  clearTimeout(timer);
                  timer = 0;
               }
               if (!e.data || !e.data.type) {
                  return;
               }
               switch (e.data.type) {
                  case 'complete':
                     document.body.removeChild(ifr);
                     if (!e.data.data) {
                        deferred.reject(new Error('something went wrong'));
                        return;
                     }
                     progress(1);
                     deferred.resolve({
                        buffer: e.data.data,
                        name: e.data.name ? e.data.name : Main.extractFilePrefixFromUrl(url)
                     });
                     return;
                  case 'error':
                     document.body.removeChild(ifr);
                     deferred.reject(new Error(e.data.message ? e.data.message : 'could not receive data'));
                     return;
                  case 'progress':
                     if (('loaded' in e.data) && ('total' in e.data)) {
                        progress(e.data.loaded / e.data.total);
                     }
                     return;
               }
            };
            ifr.contentWindow.postMessage(
               location.protocol,
               url.replace(/^([^:]+:\/\/[^\/]+).*$/, '$1'), [msgCh.port2]);
         };
         ifr.src = url;
         ifr.style.display = 'none';
         document.body.appendChild(ifr);
         return deferred.promise;
      }

      private static loadAsBlobFromString(progress: (progress: number) => void, url: string) {
         if (url.substring(0, 3) === 'xd:') {
            return this.loadAsBlobCrossDomain(progress, url.substring(3));
         }
         const deferred = m.deferred();
         const xhr = new XMLHttpRequest();
         xhr.open('GET', url);
         xhr.responseType = 'blob';
         xhr.onload = e => {
            progress(1);
            if (xhr.status === 200) {
               deferred.resolve({
                  buffer: xhr.response,
                  name: Main.extractFilePrefixFromUrl(url)
               });
               return;
            }
            deferred.reject(new Error(xhr.status + ' ' + xhr.statusText));
         };
         xhr.onerror = e => {
            console.error(e);
            deferred.reject(new Error('could not receive data'));
         };
         xhr.onprogress = e => progress(e.loaded / e.total);
         xhr.send(null);
         return deferred.promise;
      }

      private static loadAsBlob(progress: (progress: number) => void, file_or_url: File | string) {
         if (file_or_url instanceof File) {
            const file = file_or_url;
            const deferred = m.deferred();
            setTimeout(() => {
               deferred.resolve({
                  buffer: file,
                  name: file.name.replace(/\..*$/i, '') + '_'
               });
            }, 0);
            return deferred.promise;
         } else {
            return this.loadAsBlobFromString(progress, file_or_url);
         }
      }
   }
}

(() => {
   const originalStopCallback: (e: KeyboardEvent, element: HTMLElement, combo?: string) => boolean = Mousetrap.prototype.stopCallback;
   Mousetrap.prototype.stopCallback = function(e: KeyboardEvent, element: HTMLElement, combo?: string): boolean {
      if (!this.paused) {
         if (element.classList.contains('psdtool-layer-visible') || element.classList.contains('psdtool-faview-select')) {
            return false;
         }
      }
      return originalStopCallback.call(this, e, element, combo);
   };
   Mousetrap.init();
})();
(() => {
   const main = new psdtool.Main();
   document.addEventListener('DOMContentLoaded', e => main.init(), false);
})();
