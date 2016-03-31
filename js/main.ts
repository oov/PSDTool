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
(function() {
   let originalStopCallback: (e: KeyboardEvent, element: HTMLElement, combo?: string) => boolean = Mousetrap.prototype.stopCallback;
   Mousetrap.prototype.stopCallback = function(e: KeyboardEvent, element: HTMLElement, combo?: string): boolean {
      if (!this.paused) {
         if (element.classList.contains('psdtool-layer-visible')) {
            return false;
         }
      }
      return originalStopCallback.call(this, e, element, combo);
   };
   Mousetrap.init();

   var ui: {
      optionAutoTrim: HTMLInputElement;
      optionSafeMode: HTMLInputElement;

      sideBody: HTMLElement;
      sideBodyScrollPos: { [name: string]: { left: number; top: number } };
      normalModeState: string;

      previewCanvas: HTMLCanvasElement;
      previewBackground: HTMLElement;
      redraw: () => void;
      save: (filename: string) => void;

      showReadme: HTMLButtonElement;
      invertInput: HTMLInputElement;
      fixedSide: HTMLSelectElement;
      maxPixels: HTMLInputElement;
      seqDlPrefix: HTMLInputElement;
      seqDlNum: HTMLInputElement;
      seqDl: HTMLButtonElement;

      favoriteToolbar: HTMLElement;

      filterEditingTarget: Favorite.Node;
      useFilter: HTMLInputElement;
      filterTree: HTMLUListElement;

      bulkCreateFolderTextarea: HTMLTextAreaElement;

      bulkRenameData: Favorite.RenameNode[];
   } = {
         optionAutoTrim: null,
         optionSafeMode: null,

         sideBody: null,
         sideBodyScrollPos: null,
         normalModeState: null,

         previewCanvas: null,
         previewBackground: null,
         redraw: null,
         save: null,

         showReadme: null,
         invertInput: null,
         fixedSide: null,
         maxPixels: null,
         seqDlPrefix: null,
         seqDlNum: null,
         seqDl: null,

         favoriteToolbar: null,

         filterEditingTarget: null,
         useFilter: null,
         filterTree: null,

         bulkCreateFolderTextarea: null,

         bulkRenameData: null,
      };
   var renderer: Renderer.Renderer;
   var psdRoot: psd.Root;
   var filterRoot: LayerTree.Filter;
   var layerRoot: LayerTree.LayerTree;
   var favorite: Favorite.Favorite;
   var droppedPFV: File;

   function init() {
      initDropZone('dropzone', files => {
         let i: number, ext: string;
         for (i = 0; i < files.length; ++i) {
            ext = files[i].name.substring(files[i].name.length - 4).toLowerCase();
            if (ext === '.pfv') {
               droppedPFV = files[i];
               break;
            }
         }
         for (i = 0; i < files.length; ++i) {
            ext = files[i].name.substring(files[i].name.length - 4).toLowerCase();
            if (ext !== '.pfv') {
               loadAndParse(files[i]);
               return;
            }
         }
      });
      initUI();
      document.getElementById('samplefile').addEventListener('click', e =>
         loadAndParse(document.getElementById('samplefile').getAttribute('data-filename')), false);
      window.addEventListener('resize', resized, false);
      window.addEventListener('hashchange', hashchanged, false);
      hashchanged();

      var elems = document.querySelectorAll('.psdtool-loading');
      for (var i = 0; i < elems.length; ++i) {
         elems[i].classList.add('psdtool-loaded');
         elems[i].classList.remove('psdtool-loading');
      }
   }

   function resized() {
      var mainContainer = document.getElementById('main-container');
      var miscUi = document.getElementById('misc-ui');
      var previewContainer = document.getElementById('preview-container');
      previewContainer.style.display = 'none';
      previewContainer.style.width = mainContainer.clientWidth + 'px';
      previewContainer.style.height = (mainContainer.clientHeight - miscUi.offsetHeight) + 'px';
      previewContainer.style.display = 'block';

      var sideContainer = document.getElementById('side-container');
      var sideHead = document.getElementById('side-head');
      var sideBody = document.getElementById('side-body');
      sideBody.style.display = 'none';
      sideBody.style.width = sideContainer.clientWidth + 'px';
      sideBody.style.height = (sideContainer.clientHeight - sideHead.offsetHeight) + 'px';
      sideBody.style.display = 'block';

      document.getElementById('favorite-tree').style.paddingTop = ui.favoriteToolbar.clientHeight + 'px';
   }

   function hashchanged() {
      var hashData = decodeURIComponent(location.hash.substring(1));
      if (hashData.substring(0, 5) === 'load:') {
         loadAndParse(hashData.substring(5));
      }
   }

   function updateProgress(barElem: HTMLElement, captionElem: HTMLElement, progress: number, caption: string): void {
      var p = progress * 100;
      barElem.style.width = p + '%';
      barElem.setAttribute('aria-valuenow', p.toFixed(0) + '%');
      removeAllChild(captionElem);
      captionElem.appendChild(document.createTextNode(p.toFixed(0) + '% ' + caption));
   }

   function loadAndParse(file_or_url: File | string) {
      var fileOpenUi = document.getElementById('file-open-ui');
      var fileLoadingUi = document.getElementById('file-loading-ui');
      var errorReportUi = document.getElementById('error-report-ui');
      var main = document.getElementById('main');
      var bar = document.getElementById('progress-bar');

      fileOpenUi.style.display = 'none';
      fileLoadingUi.style.display = 'block';
      errorReportUi.style.display = 'none';
      main.style.display = 'none';
      Mousetrap.pause();

      var caption = document.getElementById('progress-caption');
      var errorMessageContainer = document.getElementById('error-message');
      var errorMessage = document.createTextNode('');

      removeAllChild(errorMessageContainer);
      errorMessageContainer.appendChild(errorMessage);

      let progress = (phase: string, progress: number) => {
         let msg: string;
         switch (phase) {
            case 'prepare':
               msg = 'Getting ready...';
               break;
            case 'receive':
               msg = 'Receiving file...';
               break;
            case 'load':
               msg = 'Loading file...';
               break;
         }
         updateProgress(bar, caption, progress, msg);
      };
      progress('prepare', 0);
      loadAsBlob(progress, file_or_url)
         .then(parse.bind(this, progress.bind(this, 'load')))
         .then((obj: any) => { return initMain(obj.psd, obj.name); })
         .then(function() {
         fileLoadingUi.style.display = 'none';
         fileOpenUi.style.display = 'none';
         errorReportUi.style.display = 'none';
         main.style.display = 'block';
         Mousetrap.unpause();
         resized();
      }, e => {
            fileLoadingUi.style.display = 'none';
            fileOpenUi.style.display = 'block';
            errorReportUi.style.display = 'block';
            main.style.display = 'none';
            Mousetrap.pause();
            errorMessage.textContent = e.toString();
            console.error(e);
         });
   }

   function loadAsBlobCrossDomain(progress: (phase: string, progress: number) => void, url: string) {
      var deferred = m.deferred();
      if (location.protocol === 'https:' && url.substring(0, 5) === 'http:') {
         setTimeout((): void => deferred.reject(new Error('cannot access to the insecure content from HTTPS.')), 0);
         return deferred.promise;
      }
      var ifr = document.createElement('iframe'),
         port: MessagePort;
      var timer = setTimeout(() => {
         port.onmessage = null;
         document.body.removeChild(ifr);
         deferred.reject(new Error('something went wrong'));
      }, 20000);
      ifr.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      ifr.onload = function() {
         var msgCh = new MessageChannel();
         port = msgCh.port1;
         port.onmessage = e => {
            if (timer) {
               clearTimeout(timer);
               timer = null;
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
                  progress('receive', 1);
                  deferred.resolve({
                     buffer: e.data.data,
                     name: e.data.name ? e.data.name : extractFilePrefixFromUrl(url)
                  });
                  return;
               case 'error':
                  document.body.removeChild(ifr);
                  deferred.reject(new Error(e.data.message ? e.data.message : 'could not receive data'));
                  return;
               case 'progress':
                  if (('loaded' in e.data) && ('total' in e.data)) {
                     progress('receive', e.data.loaded / e.data.total);
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

   function loadAsBlobFromString(progress: (phase: string, progress: number) => void, url: string) {
      if (url.substring(0, 3) === 'xd:') {
         return loadAsBlobCrossDomain(progress, url.substring(3));
      }
      var deferred = m.deferred();
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      xhr.onload = e => {
         progress('receive', 1);
         if (xhr.status === 200) {
            deferred.resolve({
               buffer: xhr.response,
               name: extractFilePrefixFromUrl(url)
            });
            return;
         }
         deferred.reject(new Error(xhr.status + ' ' + xhr.statusText));
      };
      xhr.onerror = e => {
         console.error(e);
         deferred.reject(new Error('could not receive data'));
      };
      xhr.onprogress = e => progress('receive', e.loaded / e.total);
      xhr.send(null);
      return deferred.promise;
   }

   function loadAsBlob(progress: (phase: string, progress: number) => void, file_or_url: File | string) {
      progress('prepare', 0);
      if (file_or_url instanceof File) {
         let file = file_or_url;
         let deferred = m.deferred();
         setTimeout(() => deferred.resolve({
            buffer: file,
            name: file.name.replace(/\..*$/i, '') + '_'
         }), 0);
         return deferred.promise;
      } else {
         return loadAsBlobFromString(progress, file_or_url);
      }
   }

   function extractFilePrefixFromUrl(url: string): string {
      url = url.replace(/#[^#]*$/, '');
      url = url.replace(/\?[^?]*$/, '');
      url = url.replace(/^.*?([^\/]+)$/, '$1');
      url = url.replace(/\..*$/i, '') + '_';
      return url;
   }

   function parse(progress: (progress: number, layerName: string) => void, obj: { buffer: ArrayBuffer | Blob, name: string }) {
      var deferred = m.deferred();
      PSD.parseWorker(
         obj.buffer,
         progress,
         psd => deferred.resolve({ psd: psd, name: obj.name }),
         error => deferred.reject(error)
         );
      return deferred.promise;
   }

   function removeAllChild(elem: HTMLElement): void {
      for (let i = elem.childNodes.length - 1; i >= 0; --i) {
         elem.removeChild(elem.firstChild);
      }
   }

   function initMain(psd: psd.Root, name: string) {
      var deferred = m.deferred();
      setTimeout(function() {
         try {
            renderer = new Renderer.Renderer(psd);
            let layerTree = <HTMLUListElement>document.getElementById('layer-tree');
            layerRoot = new LayerTree.LayerTree(ui.optionSafeMode.checked, layerTree, psd);
            filterRoot = new LayerTree.Filter(ui.filterTree, psd);
            for (let key in renderer.nodes) {
               if (!renderer.nodes.hasOwnProperty(key)) {
                  continue;
               }
               ((r: Renderer.Node, l: LayerTree.Node) => {
                  r.getVisibleState = () => l.checked;
               })(renderer.nodes[key], layerRoot.nodes[key]);
            }
            layerTree.addEventListener('click', e => {
               let target = e.target;
               if (target instanceof HTMLInputElement && target.classList.contains('psdtool-layer-visible')) {
                  let n: LayerTree.Node = layerRoot.nodes[parseInt(target.getAttribute('data-seq'), 10)];
                  for (let p = n.parent; !p.isRoot; p = p.parent) {
                     p.checked = true;
                  }
                  if (n.clippedBy) {
                     n.clippedBy.checked = true;
                  }
                  ui.redraw();
               }
            }, false);

            ui.maxPixels.value = (ui.optionAutoTrim.checked ? renderer.Height : renderer.CanvasHeight).toString();
            ui.seqDlPrefix.value = name;
            ui.seqDlNum.value = '0';
            ui.showReadme.style.display = psd.Readme !== '' ? 'block' : 'none';
            //  TODO: error handling
            favorite.psdHash = psd.Hash;
            if (droppedPFV) {
               let fr = new FileReader();
               fr.onload = () => {
                  favorite.loadFromArrayBuffer(fr.result);
               };
               fr.readAsArrayBuffer(droppedPFV);
            } else {
               if (!favorite.loadFromLocalStorage(psd.Hash)) {
                  if (psd.PFV !== '') {
                     favorite.loadFromString(psd.PFV);
                  }
               }
            }
            psdRoot = psd;
            ui.redraw();
            deferred.resolve();
         } catch (e) {
            deferred.reject(e);
         }
      }, 0);
      return deferred.promise;
   }

   function render(callback: (progress: number, canvas: HTMLCanvasElement) => void): void {
      const autoTrim = ui.optionAutoTrim.checked;
      let scale = 1;
      const px = parseInt(ui.maxPixels.value, 10);
      const w = autoTrim ? renderer.Width : renderer.CanvasWidth;
      const h = autoTrim ? renderer.Height : renderer.CanvasHeight;
      switch (ui.fixedSide.value) {
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
      renderer.render(scale, autoTrim, ui.invertInput.checked, callback);
   }

   function cleanForFilename(f: string): string {
      return f.replace(/[\x00-\x1f\x22\x2a\x2f\x3a\x3c\x3e\x3f\x7c\x7f]+/g, '_');
   }

   function formateDate(d: Date): string {
      let s = d.getFullYear() + '-';
      s += ('0' + (d.getMonth() + 1)).slice(-2) + '-';
      s += ('0' + d.getDate()).slice(-2) + ' ';
      s += ('0' + d.getHours()).slice(-2) + ':';
      s += ('0' + d.getMinutes()).slice(-2) + ':';
      s += ('0' + d.getSeconds()).slice(-2);
      return s;
   }

   function pfvOnDrop(files: FileList): void {
      leaveReaderMode();
      let i: number, ext: string;
      for (i = 0; i < files.length; ++i) {
         ext = files[i].name.substring(files[i].name.length - 4).toLowerCase();
         if (ext === '.pfv') {
            // TODO: error handling
            var fr = new FileReader();
            fr.onload = e => {
               if (favorite.loadFromArrayBuffer(fr.result)) {
                  jQuery('#import-dialog').modal('hide');
               }
            };
            fr.readAsArrayBuffer(files[i]);
            return;
         }
      }
   }

   function getInputElement(query: string): HTMLInputElement {
      let elem = document.querySelector(query);
      if (elem instanceof HTMLInputElement) {
         return elem;
      }
      throw new Error('element not found ' + query);
   }

   function initFavoriteUI(): void {
      favorite = new Favorite.Favorite(
         document.getElementById('favorite-tree'),
         document.getElementById('favorite-tree').getAttribute('data-root-name'));
      favorite.onClearSelection = () => leaveReaderMode();
      favorite.onSelect = (item: Favorite.Node) => {
         if (item.type !== 'item') {
            leaveReaderMode();
            return;
         }
         try {
            let filter: string;
            for (let p of favorite.getParents(item)) {
               if (p.type === 'filter') {
                  filter = p.data.value;
                  break;
               }
            }
            enterReaderMode(item.data.value, filter, item.text + '.png');
         } catch (e) {
            console.error(e);
            alert(e);
         }
      };
      favorite.onDoubleClick = (item: Favorite.Node): void => {
         try {
            switch (item.type) {
               case 'item':
                  let filter: string;
                  for (let p of favorite.getParents(item)) {
                     if (p.type === 'filter') {
                        filter = p.data.value;
                        break;
                     }
                  }
                  leaveReaderMode(item.data.value, filter);
                  break;
               case 'folder':
               case 'filter':
                  ui.filterEditingTarget = item;
                  let dialog = jQuery('#filter-dialog');
                  if (!dialog.data('bs.modal')) {
                     dialog.modal();
                  } else {
                     dialog.modal('show');
                  }
                  break;
            }
         } catch (e) {
            console.error(e);
            alert(e);
         }
      };

      jQuery('button[data-psdtool-tree-add-item]').on('click', e => {
         leaveReaderMode();
         favorite.add('item', true, '', layerRoot.serialize(false));
      });
      Mousetrap.bind('mod+b', e => {
         e.preventDefault();
         let text = prompt(document.querySelector('button[data-psdtool-tree-add-item]').getAttribute('data-caption'), '');
         if (text === null || text === '') {
            return;
         }
         leaveReaderMode();
         favorite.add('item', false, text, layerRoot.serialize(false));
      });

      jQuery('button[data-psdtool-tree-add-folder]').on('click', e => {
         favorite.add('folder', true);
      });
      Mousetrap.bind('mod+d', e => {
         e.preventDefault();
         let text = prompt(document.querySelector('button[data-psdtool-tree-add-folder]').getAttribute('data-caption'), '');
         if (text === null || text === '') {
            return;
         }
         favorite.clearSelection();
         favorite.add('folder', false, text);
      });

      jQuery('button[data-psdtool-tree-rename]').on('click', e => favorite.edit());
      Mousetrap.bind('f2', e => {
         e.preventDefault();
         favorite.edit();
      });

      jQuery('button[data-psdtool-tree-remove]').on('click', e => favorite.remove());

      Mousetrap.bind('shift+mod+g', e => {
         let target = e.target;
         if (target instanceof HTMLElement && target.classList.contains('psdtool-layer-visible')) {
            e.preventDefault();
            if (!target.classList.contains('psdtool-layer-radio')) {
               return;
            }
            if (target instanceof HTMLInputElement) {
               let old = layerRoot.serialize(true);
               let created: string[] = [];
               let n: LayerTree.Node;
               let elems = <NodeListOf<HTMLInputElement>>document.querySelectorAll(
                  'input[name="' + target.name + '"].psdtool-layer-radio');
               for (let i = 0; i < elems.length; ++i) {
                  n = layerRoot.nodes[parseInt(elems[i].getAttribute('data-seq'), 10)];
                  n.checked = true;
                  favorite.add('item', false, n.displayName, layerRoot.serialize(false));
                  created.push(n.displayName);
               }
               layerRoot.deserialize(old);
               ui.redraw();
               alert(created.length + ' favorite item(s) has been added.\n\n' + created.join('\n'));
            }
         }
      });

      initDropZone('pfv-dropzone', pfvOnDrop);
      initDropZone('pfv-dropzone2', pfvOnDrop);
      jQuery('#import-dialog').on('shown.bs.modal', e => {
         // build the recent list
         let recents = document.getElementById('pfv-recents');
         removeAllChild(recents);
         let pfvs: { id: string; hash: string; data: string; time: number }[] = [],
            btn: HTMLButtonElement;
         if ('psdtool_pfv' in localStorage) {
            pfvs = JSON.parse(localStorage['psdtool_pfv']);
         }
         for (let i = pfvs.length - 1; i >= 0; --i) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'list-group-item';
            if (pfvs[i].hash === psdRoot.Hash) {
               btn.className += ' list-group-item-info';
            }
            btn.setAttribute('data-dismiss', 'modal');
            ((btn: HTMLButtonElement, data: string, uniqueId: string) => {
               btn.addEventListener('click', e => {
                  leaveReaderMode();
                  // TODO: error handling
                  favorite.loadFromString(data, uniqueId);
               }, false);
            })(btn, pfvs[i].data, pfvs[i].id);
            btn.appendChild(document.createTextNode(
               Favorite.countEntries(pfvs[i].data) +
               ' item(s) / Created at ' +
               formateDate(new Date(pfvs[i].time))
               ));
            recents.appendChild(btn);
         }
      });

      let updateFilter = (): void => {
         let node: Favorite.Node = ui.filterEditingTarget;
         if (!ui.useFilter.checked) {
            favorite.update({ id: node.id, type: 'folder' });
            favorite.updateLocalStorage();
            return;
         }
         let s = filterRoot.serialize();
         if (!s) {
            favorite.update({ id: node.id, type: 'folder' });
            favorite.updateLocalStorage();
            return;
         }
         favorite.update({ id: node.id, type: 'filter', data: { value: s } });
         favorite.updateLocalStorage();
      };
      ui.useFilter = getInputElement('#use-filter');
      ui.useFilter.addEventListener('click', e => {
         let inp = e.target;
         if (inp instanceof HTMLInputElement) {
            if (inp.checked) {
               ui.filterTree.classList.remove('disabled');
            } else {
               ui.filterTree.classList.add('disabled');
            }
            updateFilter();
         }
      }, false);
      let elem = document.getElementById('filter-tree');
      if (elem instanceof HTMLUListElement) {
         ui.filterTree = elem;
      } else {
         throw new Error('element not found #filter-tree');
      }
      ui.filterTree.addEventListener('click', e => {
         let inp = e.target;
         if (inp instanceof HTMLInputElement) {
            let li = inp.parentElement;
            while (li && li.tagName !== 'LI') {
               li = li.parentElement;
            }
            if (inp.checked) {
               li.classList.add('checked');
            } else {
               li.classList.remove('checked');
            }
            updateFilter();
         }
      }, false);
      jQuery('#filter-dialog').on('shown.bs.modal', e => {
         let parents: string[] = [];
         for (let p of favorite.getParents(ui.filterEditingTarget)) {
            if (p.type === 'filter') {
               parents.push(p.data.value);
            }
         }
         if (ui.filterEditingTarget.type === 'filter') {
            ui.useFilter.checked = true;
            ui.filterTree.classList.remove('disabled');
            filterRoot.deserialize(ui.filterEditingTarget.data.value, parents);
         } else {
            ui.useFilter.checked = false;
            ui.filterTree.classList.add('disabled');
            filterRoot.deserialize('', parents);
         }
         let inputs = <NodeListOf<HTMLInputElement>>ui.filterTree.querySelectorAll('input');
         for (let i = 0, elem: HTMLInputElement, li: HTMLElement; i < inputs.length; ++i) {
            elem = inputs[i];
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
      });

      jQuery('#bulk-create-folder-dialog').on('shown.bs.modal', e => ui.bulkCreateFolderTextarea.focus());
      let e = document.getElementById('bulk-create-folder-textarea');
      if (e instanceof HTMLTextAreaElement) {
         ui.bulkCreateFolderTextarea = e;
      } else {
         throw new Error('element not found: #bulk-create-folder-textarea');
      }
      document.getElementById('bulk-create-folder').addEventListener('click', e => {
         let folders: string[] = [];
         for (let line of ui.bulkCreateFolderTextarea.value.replace(/\r/g, '').split('\n')) {
            line = line.trim();
            if (line === '') {
               continue;
            }
            folders.push(line);
         }
         favorite.addFolders(folders);
         ui.bulkCreateFolderTextarea.value = '';
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
         let elem = document.getElementById('bulk-rename-tree');
         ui.bulkRenameData = favorite.renameNodes;
         removeAllChild(elem);
         r(elem, ui.bulkRenameData);
      });
      document.getElementById('bulk-rename').addEventListener('click', e => {
         favorite.bulkRename(ui.bulkRenameData);
      }, false);

      document.getElementById('export-favorites-pfv').addEventListener('click', e => {
         saveAs(new Blob([favorite.pfv], {
            type: 'text/plain'
         }), cleanForFilename(favorite.rootName) + '.pfv');
      }, false);

      document.getElementById('export-favorites-zip').addEventListener('click', e => {
         let parents: Favorite.Node[] = [];
         let path: string[] = [],
            files: { name: string; value: string; filter?: string }[] = [];
         let r = (children: Favorite.Node[]) => {
            for (let item of children) {
               path.push(cleanForFilename(item.text));
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
         let json = favorite.json;
         r(json);

         var backup = layerRoot.serialize(true);
         let z = new Zipper.Zipper();

         let progressBar = document.getElementById('export-progress-dialog-progress-bar');
         let progressCaption = document.getElementById('export-progress-dialog-progress-caption');
         let reportProgress: (progress: number, caption: string) => void = updateProgress.bind(this, progressBar, progressCaption);

         let aborted = false;
         let errorHandler = (readableMessage: string, err: any) => {
            z.dispose(err => undefined);
            console.error(err);
            if (!aborted) {
               alert(readableMessage + ': ' + err);
            }
            jQuery('#export-progress-dialog').modal('hide');
         };
         // it is needed to avoid alert storm when reload during exporting.
         window.addEventListener('unload', () => { aborted = true; }, false);

         let added = 0;
         let addedHandler = () => {
            if (++added < files.length + 1) {
               reportProgress(
                  added / (files.length + 1),
                  added === 1 ? 'drawing...' : '(' + added + '/' + files.length + ') ' + files[added - 1].name);
               return;
            }
            layerRoot.deserialize(backup);
            reportProgress(1, 'building a zip...');
            z.generate(blob => {
               jQuery('#export-progress-dialog').modal('hide');
               saveAs(blob, cleanForFilename(favorite.rootName) + '.zip');
               z.dispose(err => undefined);
            }, errorHandler.bind(this, 'cannot create a zip archive'));
         };

         z.init(() => {
            z.add(
               'favorites.pfv',
               new Blob([favorite.pfv], { type: 'text/plain; charset=utf-8' }),
               addedHandler,
               errorHandler.bind(this, 'cannot write pfv to a zip archive'));

            let i = 0;
            let process = () => {
               if ('filter' in files[i]) {
                  layerRoot.deserializePartial('', files[i].value, files[i].filter);
               } else {
                  layerRoot.deserialize(files[i].value);
               }
               render((progress, canvas) => {
                  if (progress !== 1) {
                     return;
                  }
                  z.add(
                     files[i].name,
                     new Blob([dataSchemeURIToArrayBuffer(canvas.toDataURL())], { type: 'image/png' }),
                     addedHandler,
                     errorHandler.bind(this, 'cannot write png to a zip archive'));
                  if (++i < files.length) {
                     setTimeout(process, 0);
                  }
               });
            };
            process();
         }, errorHandler.bind(this, 'cannot create a zip archive'));
         let dialog = jQuery('#export-progress-dialog');
         if (!dialog.data('bs.modal')) {
            dialog.modal();
         } else {
            dialog.modal('show');
         }
      }, false);

      document.getElementById('export-layer-structure').addEventListener('click', e => {
         saveAs(new Blob([layerRoot.text], {
            type: 'text/plain'
         }), 'layer.txt');
      }, false);

   }

   function dataSchemeURIToArrayBuffer(str: string): ArrayBuffer {
      let bin = atob(str.substring(str.indexOf(',') + 1));
      let buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; ++i) {
         buf[i] = bin.charCodeAt(i);
      }
      return buf.buffer;
   }

   function normalizeNumber(s: string): string {
      return s.replace(/[\uff10-\uff19]/g, (m): string => {
         return (m[0].charCodeAt(0) - 0xff10).toString();
      });
   }

   function initUI() {
      ui.optionAutoTrim = getInputElement('#option-auto-trim');
      ui.optionSafeMode = getInputElement('#option-safe-mode');

      // save and restore scroll position of side-body on each tab.
      ui.favoriteToolbar = document.getElementById('favorite-toolbar');
      ui.sideBody = document.getElementById('side-body');
      ui.sideBody.addEventListener('scroll', e => {
         ui.favoriteToolbar.style.top = ui.sideBody.scrollTop + 'px';
      }, false);
      ui.sideBodyScrollPos = {};
      jQuery('a[data-toggle="tab"]').on('hide.bs.tab', e => {
         let tab = e.target.getAttribute('href');
         ui.sideBodyScrollPos[tab] = {
            left: ui.sideBody.scrollLeft,
            top: ui.sideBody.scrollTop
         };
      }).on('shown.bs.tab', e => {
         let tab = e.target.getAttribute('href');
         if (tab in ui.sideBodyScrollPos) {
            ui.sideBody.scrollLeft = ui.sideBodyScrollPos[tab].left;
            ui.sideBody.scrollTop = ui.sideBodyScrollPos[tab].top;
         }
         resized();
      });
      jQuery('a[data-toggle="tab"][href="#layer-tree-pane"]').on('show.bs.tab', e => {
         leaveReaderMode();
      });

      initFavoriteUI();

      ui.previewBackground = document.getElementById('preview-background');
      let elem = document.getElementById('preview');
      if (elem instanceof HTMLCanvasElement) {
         ui.previewCanvas = elem;
      } else {
         throw new Error('element not found: #preview');
      }
      ui.previewCanvas.addEventListener('dragstart', e => {
         let s = ui.previewCanvas.toDataURL();
         let name = ui.previewCanvas.getAttribute('data-filename');
         if (name) {
            let p = s.indexOf(';');
            s = s.substring(0, p) + ';filename=' + encodeURIComponent(name) + s.substring(p);
         }
         e.dataTransfer.setData('text/uri-list', s);
         e.dataTransfer.setData('text/plain', s);
      }, false);
      ui.redraw = () => {
         ui.seqDl.disabled = true;
         render((progress, canvas) => {
            ui.previewBackground.style.width = canvas.width + 'px';
            ui.previewBackground.style.height = canvas.height + 'px';
            ui.seqDl.disabled = progress !== 1;
            ui.previewCanvas.draggable = progress === 1;
            setTimeout(() => {
               ui.previewCanvas.width = canvas.width;
               ui.previewCanvas.height = canvas.height;
               ui.previewCanvas.getContext('2d').drawImage(canvas, 0, 0);
            }, 0);
         });
         layerRoot.updateClass();
      };

      ui.save = filename => saveAs(new Blob([
         dataSchemeURIToArrayBuffer(ui.previewCanvas.toDataURL())
      ], { type: 'image/png' }), filename);

      elem = document.getElementById('show-readme');
      if (elem instanceof HTMLButtonElement) {
         ui.showReadme = elem;
      } else {
         throw new Error('element not found: #show-readme');
      }
      ui.showReadme.addEventListener('click', e => {
         let w = window.open('', null);
         w.document.body.innerHTML = '<title>Readme - PSDTool</title><pre style="font: 12pt/1.7 monospace;"></pre>';
         w.document.querySelector('pre').textContent = psdRoot.Readme;
      }, false);

      jQuery('#main').on('splitpaneresize', resized).splitPane();

      ui.invertInput = getInputElement('#invert-input');
      ui.invertInput.addEventListener('click', e => ui.redraw(), false);
      elem = document.getElementById('fixed-side');
      if (elem instanceof HTMLSelectElement) {
         ui.fixedSide = elem;
      } else {
         throw new Error('element not found: #fixed-side');
      }
      ui.fixedSide.addEventListener('change', e => ui.redraw(), false);

      let lastPx: string;
      ui.maxPixels = getInputElement('#max-pixels');
      ui.maxPixels.addEventListener('blur', e => {
         let v = normalizeNumber(ui.maxPixels.value);
         if (v === lastPx) {
            return;
         }
         lastPx = v;
         ui.maxPixels.value = v;
         ui.redraw();
      }, false);

      ui.seqDlPrefix = getInputElement('#seq-dl-prefix');
      ui.seqDlNum = getInputElement('#seq-dl-num');
      elem = document.getElementById('seq-dl');
      if (elem instanceof HTMLButtonElement) {
         ui.seqDl = elem;
      } else {
         throw new Error('element not found: #seq-dl');
      }
      ui.seqDl.addEventListener('click', e => {
         let prefix = ui.seqDlPrefix.value;
         if (ui.seqDlNum.value === '') {
            ui.save(prefix + '.png');
            return;
         }

         let num = parseInt(normalizeNumber(ui.seqDlNum.value), 10);
         if (num < 0) {
            num = 0;
         }
         if (ui.save(prefix + ('0000' + num).slice(-4) + '.png')) {
            ui.seqDlNum.value = (num + 1).toString();
         }
      }, false);

      Mousetrap.pause();
   }

   function enterReaderMode(state: string, filter?: string, filename?: string): void {
      if (!ui.previewBackground.classList.contains('reader')) {
         ui.previewBackground.classList.add('reader');
         ui.normalModeState = layerRoot.serialize(true);
      }
      if (!filter) {
         layerRoot.deserialize(state);
      } else {
         layerRoot.deserializePartial(ui.normalModeState, state, filter);
      }
      if (filename) {
         ui.previewCanvas.setAttribute('data-filename', filename);
      }
      ui.redraw();
   }

   function leaveReaderMode(state?: string, filter?: string): void {
      if (ui.previewBackground.classList.contains('reader')) {
         ui.previewBackground.classList.remove('reader');
      }
      if (state) {
         ui.previewCanvas.removeAttribute('data-filename');
         if (!filter) {
            layerRoot.deserialize(state);
         } else {
            if (ui.normalModeState) {
               layerRoot.deserializePartial(ui.normalModeState, state, filter);
            } else {
               layerRoot.deserializePartial(undefined, state, filter);
            }
         }
      } else if (ui.normalModeState) {
         ui.previewCanvas.removeAttribute('data-filename');
         layerRoot.deserialize(ui.normalModeState);
      } else {
         return;
      }
      ui.redraw();
      ui.normalModeState = null;
   }

   function initDropZone(dropZoneId: string, loader: (files: FileList) => void): void {
      let dz = document.getElementById(dropZoneId);
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
      let f = dz.querySelector('input[type=file]');
      if (f instanceof HTMLInputElement) {
         let file = f;
         f.addEventListener('change', e => {
            loader(file.files);
            file.value = null;
         }, false);
      }
   }
   document.addEventListener('DOMContentLoaded', init, false);
})();
