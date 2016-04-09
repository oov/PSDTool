'use strict';
module Favorite {
   export interface PFVOnLS {
      id: string;
      time: number;
      hash: string;
      data: string;
   }
   export interface Node {
      id?: string;
      text?: string;
      type?: string;
      data?: {
         value: string;
      };
      state?: {
         opened: boolean
      };
      children?: (Node | string)[];
      parent?: Node | string;
   }
   export interface RenameNode {
      id: string;
      text: string;
      originalText: string;
      children: RenameNode[];
   }
   export const enum FaviewMode {
      ShowLayerTree,
      ShowFaview,
      ShowFaviewAndReadme
   }
   class JSONBuilder {
      private json_: Node[];
      get json(): Node[] { return this.json_; }
      get root(): Node { return this.json_[0]; }
      constructor(rootText: string) {
         this.json_ = [{
            id: 'root',
            text: rootText,
            type: 'root',
            state: {
               opened: true
            },
            children: []
         }];
      }

      public add(name: string, type: string, data?: string): void {
         let i: number, j: number, partName: string;
         let c = this.json_;
         let nameParts = name.split('/');
         nameParts.unshift(JSONBuilder.encodeName(this.root.text));
         for (i = 0; i < nameParts.length; ++i) {
            partName = JSONBuilder.decodeName(nameParts[i]);
            for (j = 0; j < c.length; ++j) {
               if (c[j].text === partName) {
                  c = <Node[]>c[j].children;
                  j = -1;
                  break;
               }
            }
            if (j !== c.length) {
               continue;
            }
            if (i !== nameParts.length - 1) {
               c.push(JSONBuilder.createNode(partName, 'folder'));
               c = c[c.length - 1].children;
               continue;
            }
            c.push(JSONBuilder.createNode(partName, type, data));
         }
      }

      private static createNode(text: string, type: string, data?: string): Node {
         switch (type) {
            case 'item':
               return {
                  text: text,
                  type: type,
                  data: {
                     value: data
                  },
                  children: []
               };
            case 'folder':
               return {
                  text: text,
                  type: type,
                  state: {
                     opened: true
                  },
                  children: []
               };
            case 'filter':
               return {
                  text: text,
                  type: type,
                  data: {
                     value: data
                  },
                  state: {
                     opened: true
                  },
                  children: []
               };
         }
         throw new Error('unknown node type: ' + type);
      }

      public static encodeName(s: string): string {
         return s.replace(/[\x00-\x1f\x22\x25\x27\x2f\x5c\x7e\x7f]/g, m =>
            '%' + ('0' + m[0].charCodeAt(0).toString(16)).slice(-2));
      }

      public static decodeName(s: string): string {
         return decodeURIComponent(s);
      }
   }

   function stringToArrayBuffer(s: string, complete: (ab: ArrayBuffer) => void): void {
      let fr = new FileReader();
      fr.onload = e => complete(fr.result);
      fr.readAsArrayBuffer(new Blob([s]));
   }

   // https://gist.github.com/boushley/5471599
   function arrayBufferToString(ab: ArrayBuffer): string {
      let data = new Uint8Array(ab);

      // If we have a BOM skip it
      let s = '', i = 0, c = 0, c2 = 0, c3 = 0;
      if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
         i = 3;
      }
      while (i < data.length) {
         c = data[i];

         if (c < 128) {
            s += String.fromCharCode(c);
            i++;
         } else if (c > 191 && c < 224) {
            if (i + 1 >= data.length) {
               throw 'UTF-8 Decode failed. Two byte character was truncated.';
            }
            c2 = data[i + 1];
            s += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i += 2;
         } else {
            if (i + 2 >= data.length) {
               throw 'UTF-8 Decode failed. Multi byte character was truncated.';
            }
            c2 = data[i + 1];
            c3 = data[i + 2];
            s += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
         }
      }
      return s;
   }

   export class Favorite {
      public psdHash = '';

      public onModified: () => void;
      public onLoaded: () => void;
      public onClearSelection: () => void;
      public onSelect: (item: Node) => void;
      public onDoubleClick: (item: Node) => void;

      public faviewMode: FaviewMode = FaviewMode.ShowFaview;

      private uniqueId = Date.now().toString() + Math.random().toString().substring(2);
      private tree: HTMLElement;
      private jq: JQuery;
      private jst: JSTree;

      get rootName(): string {
         let root = this.jst.get_node('root');
         if (root && root.text) {
            return root.text;
         }
         return this.defaultRootName;
      }

      get json(): Node[] {
         return this.jst.get_json();
      }

      get pfv(): string {
         let json = this.json;
         if (json.length !== 1) {
            throw new Error('sorry but favorite tree data is broken');
         }

         let path: string[] = [];
         let lines = ['[PSDToolFavorites-v1]'];
         let r = (children: Node[]): void => {
            for (let item of children) {
               path.push(JSONBuilder.encodeName(item.text));
               switch (item.type) {
                  case 'root':
                     lines.push('root-name/' + path[0]);
                     lines.push('faview-mode/' + this.faviewMode.toString());
                     lines.push('');
                     path.pop();
                     r(<Node[]>item.children);
                     path.push('');
                     break;
                  case 'folder':
                     if (item.children.length) {
                        r(<Node[]>item.children);
                     } else {
                        lines.push('//' + path.join('/') + '~folder');
                        lines.push('');
                     }
                     break;
                  case 'filter':
                     lines.push('//' + path.join('/') + '~filter');
                     lines.push(item.data.value);
                     lines.push('');
                     r(<Node[]>item.children);
                     break;
                  case 'item':
                     lines.push('//' + path.join('/'));
                     lines.push(item.data.value);
                     lines.push('');
                     break;
               }
               path.pop();
            }
         };
         r(json);
         return lines.join('\n');
      }

      constructor(element: HTMLElement, private defaultRootName: string, loaded?: () => void) {
         this.tree = element;
         this.jq = jQuery(this.tree);
         this.initTree(loaded);
      }

      get renameNodes(): RenameNode[] {
         let nodes: RenameNode[] = [];
         let r = (n: Node[], rn: RenameNode[]): void => {
            for (let cn of n) {
               rn.push({
                  id: cn.id,
                  text: cn.text,
                  originalText: cn.text,
                  children: []
               });
               r(cn.children, rn[rn.length - 1].children);
            }
         };
         r(this.json, nodes);
         return nodes;
      }

      public bulkRename(nodes: RenameNode[]): void {
         let r = (n: RenameNode[], reserve: boolean): void => {
            for (let cn of n) {
               if (cn.originalText !== cn.text) {
                  this.jst.rename_node(cn.id, reserve ? '_' : cn.text);
               }
               r(cn.children, reserve);
            }
         };
         r(nodes, true);
         r(nodes, false);
      }

      private jstCheck(op: string, node: Node, parent: Node): boolean {
         switch (op) {
            case 'create_node':
               return node.type !== 'root';
            case 'rename_node':
               return true;
            case 'delete_node':
               return node.type !== 'root';
            case 'move_node':
               return node.type !== 'root' && parent.id !== '#' && parent.type !== 'item';
            case 'copy_node':
               return node.type !== 'root' && parent.id !== '#' && parent.type !== 'item';
         }
      }

      public clearSelection(): void {
         if (this.jst.get_top_selected().length === 0) {
            return;
         }
         this.jst.deselect_all();
         if (this.onClearSelection) {
            this.onClearSelection();
         }
      }

      public get(id: string): Node {
         return this.jst.get_node(id);
      }

      public edit(id?: string): void {
         let target: any = id;
         if (id === undefined) {
            target = this.jst.get_top_selected();
         }
         this.jst.edit(target);
      }

      public update(n: Node): void {
         let target: Node;
         if ('id' in n) {
            target = this.jst.get_node(n.id);
         } else {
            let selected = this.jst.get_top_selected();
            if (!selected.length) {
               return;
            }
            target = selected[0];
         }
         if ('type' in n) {
            this.jst.set_type(target, n.type);
         }
         if ('data' in n) {
            target.data = n.data;
         }
      }

      public getFirstFilter(n: Node): string {
         for (let p of this.getParents(n, 'filter')) {
            return p.data.value;
         }
         return '';
      }

      public getAncestorFilters(n: Node): string[] {
         let r: string[] = [];
         for (let p of this.getParents(n, 'filter')) {
            r.push(p.data.value);
         }
         return r;
      }

      private getParents(n: Node, typeFilter?: string): Node[] {
         let parents: Node[] = [];
         for (let p = this.jst.get_node(n.parent); p; p = this.jst.get_node(p.parent)) {
            if (typeFilter === undefined || typeFilter === p.type) {
               parents.push(p);
            }
         }
         return parents;
      }

      public remove(id?: string): void {
         let target: any = id;
         if (id === undefined) {
            target = this.jst.get_top_selected();
         }
         this.clearSelection();
         try {
            this.jst.delete_node(target);
         } catch (e) {
            // workaround that an error happens when deletes node during editing.
            this.jst.delete_node(this.jst.create_node(null, 'dummy', 'last'));
            this.jst.deselect_all();
         }
      }

      private addNode(type: string, edit: boolean, text?: string, data?: string): string {
         let obj: Node;
         switch (type) {
            case 'item':
               if (text === undefined || text === '') {
                  text = 'New Item';
               }
               obj = {
                  text: text,
                  type: type,
                  data: {
                     value: data
                  },
                  children: []
               };
               break;
            case 'folder':
               if (text === undefined || text === '') {
                  text = 'New Folder';
               }
               obj = {
                  text: text,
                  type: type,
                  children: []
               };
               break;
            case 'filter':
               if (text === undefined || text === '') {
                  text = 'New Filter';
               }
               obj = {
                  text: text,
                  type: type,
                  children: []
               };
               break;
            default:
               throw new Error('unsupported object type: ' + type);
         }

         // create node
         let selectedList = this.jst.get_top_selected(true);
         if (selectedList.length === 0) {
            return this.jst.create_node('root', obj, 'last');
         }
         let selected = selectedList[0];
         if (selected.type !== 'item') {
            let n = this.jst.create_node(selected, obj, 'last');
            if (!selected.state.opened) {
               this.jst.open_node(selected, null);
            }
            return n;
         }
         let parent = this.jst.get_node(selected.parent);
         let idx = parent.children.indexOf(selected.id);
         return this.jst.create_node(parent, obj, idx !== -1 ? idx + 1 : 'last');
      }

      public add(type: string, edit: boolean, text?: string, data?: string): string {
         let id = this.addNode(type, edit, text, data);
         this.clearSelection();
         this.jst.select_node(id, true);
         if (edit) {
            this.jst.edit(id);
         }
         return id;
      }

      public addFolders(names: string[]): string[] {
         let ids: string[] = [];
         for (let name of names) {
            ids.push(this.addNode('folder', false, name));
         }
         this.clearSelection();
         for (let id of ids) {
            this.jst.select_node(id, true);
         }
         return ids;
      }

      private changedTimer = 0;
      private jstChanged(): void {
         if (this.changedTimer) {
            clearTimeout(this.changedTimer);
         }
         this.changedTimer = setTimeout(() => {
            this.changedTimer = 0;
            if (this.onModified) {
               this.onModified();
            }
            this.updateLocalStorage();
         }, 32);
      }

      private jstSelectionChanged(): void {
         let selectedList: Node[] = this.jst.get_top_selected(true);
         if (selectedList.length === 0) {
            return;
         }
         let selected = selectedList[0];
         if (selected.type !== 'item') {
            if (this.onClearSelection) {
               this.onClearSelection();
            }
            return;
         }
         try {
            if (this.onSelect) {
               this.onSelect(selected);
            }
         } catch (e) {
            console.error(e);
            alert(e);
         }
      }

      private jstCopyNode(e: Event, data: { node: Node, original: Node }): void {
         let process = (node: Node, original: Node): void => {
            const text = this.suggestUniqueName(node);
            if (node.text !== text) {
               this.jst.rename_node(node, text);
            }
            switch (node.type) {
               case 'item':
                  node.data = { value: original.data.value };
                  break;
               case 'folder':
                  for (let i = 0; i < node.children.length; ++i) {
                     process(this.jst.get_node(node.children[i]), this.jst.get_node(original.children[i]));
                  }
                  break;
               case 'filter':
                  node.data = { value: original.data.value };
                  for (let i = 0; i < node.children.length; ++i) {
                     process(this.jst.get_node(node.children[i]), this.jst.get_node(original.children[i]));
                  }
                  break;
            }
         };
         process(data.node, data.original);
      }

      private jstMoveNode(e: Event, data: { node: Node, text: string }): void {
         let text = this.suggestUniqueName(data.node, data.text);
         if (data.text !== text) {
            this.jst.rename_node(data.node, text);
         }
      }

      private jstCreateNode(e: Event, data: { node: Node, text: string }): void {
         let text = this.suggestUniqueName(data.node);
         if (data.node.text !== text) {
            this.jst.rename_node(data.node, text);
         }
      }

      private jstRenameNode(e: Event, data: { node: Node, text: string }): void {
         let text = this.suggestUniqueName(data.node, data.text);
         if (data.text !== text) {
            this.jst.rename_node(data.node, text);
         }
      }

      private jstDoubleClick(e: Event): void {
         let selected = this.jst.get_node(e.target);
         switch (selected.type) {
            case 'item':
            case 'folder':
            case 'filter':
               if (this.onDoubleClick) {
                  this.onDoubleClick(selected);
               }
               break;
            default:
               this.jst.toggle_node(selected);
               break;
         }
      }

      private suggestUniqueName(node: Node | string, newText?: string): string {
         let n: Node = this.jst.get_node(node);
         let parent: Node = this.jst.get_node(n.parent);
         let nameMap: { [name: string]: boolean } = {};
         for (let pc of parent.children) {
            if (pc === n.id) {
               continue;
            }
            nameMap[this.jst.get_text(pc)] = true;
         }
         if (newText === undefined) {
            newText = n.text;
         }
         if (!(newText in nameMap)) {
            return newText;
         }
         newText += ' ';
         let i = 2;
         while ((newText + i) in nameMap) {
            ++i;
         }
         return newText + i;
      }

      private initTree(loaded?: () => void, data?: Node[]): void {
         this.jq.jstree('destroy');
         this.jq.jstree({
            core: {
               animation: false,
               check_callback: this.jstCheck,
               dblclick_toggle: false,
               themes: {
                  dots: false
               },
               data: data ? data : new JSONBuilder(this.defaultRootName).json
            },
            types: {
               root: {
                  icon: false,
               },
               item: {
                  icon: 'glyphicon glyphicon-picture'
               },
               folder: {
                  icon: 'glyphicon glyphicon-folder-open'
               },
               filter: {
                  icon: 'glyphicon glyphicon-filter'
               }
            },
            plugins: ['types', 'dnd', 'wholerow'],
         });
         this.jst = this.jq.jstree();
         this.jq.on('changed.jstree', e => this.jstSelectionChanged());
         this.jq.on([
            'set_text.jstree',
            'create_node.jstree',
            'rename_node.jstree',
            'delete_node.jstree',
            'move_node.jstree',
            'copy_node.jstree',
            'cut.jstree',
            'paste.jstree'
         ].join(' '), e => this.jstChanged());
         this.jq.on('copy_node.jstree', (e, data) => this.jstCopyNode(e, data));
         this.jq.on('move_node.jstree', (e, data) => this.jstMoveNode(e, data));
         this.jq.on('create_node.jstree', (e, data) => this.jstCreateNode(e, data));
         this.jq.on('rename_node.jstree', (e, data) => this.jstRenameNode(e, data));
         this.jq.on('dblclick.jstree', (e) => this.jstDoubleClick(e));
         this.jq.on('ready.jstree', (e) => {
            if (loaded) {
               loaded();
            }
         });
      }

      public updateLocalStorage(): void {
         let pfv = this.pfv;
         stringToArrayBuffer(pfv, ab => {
            let pfvs = this.getPFVListFromLocalStorage();
            let found = false;
            let newUniqueId = 'pfv' + CRC32.crc32(ab).toString(16);
            for (let i = 0; i < pfvs.length; ++i) {
               if (pfvs[i].id === this.uniqueId && pfvs[i].hash === this.psdHash) {
                  pfvs.splice(i, 1);
                  found = true;
                  continue;
               }
               if (pfvs[i].id === newUniqueId && pfvs[i].hash === this.psdHash) {
                  pfvs.splice(i, 1);
               }
            }
            if (!found && countEntries(pfv) === 0) {
               return;
            }
            this.uniqueId = newUniqueId;
            pfvs.push({
               id: this.uniqueId,
               time: new Date().getTime(),
               hash: this.psdHash,
               data: pfv
            });
            while (pfvs.length > 8) {
               pfvs.shift();
            }
            localStorage['psdtool_pfv'] = JSON.stringify(pfvs);
         });
      }

      public getPFVListFromLocalStorage(): PFVOnLS[] {
         if (!('psdtool_pfv' in localStorage)) {
            return [];
         }
         return JSON.parse(localStorage['psdtool_pfv']);
      }

      public getPFVFromLocalStorage(hash: string): PFVOnLS {
         let pfvs = this.getPFVListFromLocalStorage();
         if (!pfvs.length) {
            return null;
         }
         for (var i = pfvs.length - 1; i >= 0; --i) {
            if (pfvs[i].hash === hash) {
               return pfvs[i];
            }
         }
      }

      public loadFromArrayBuffer(ab: ArrayBuffer): boolean {
         return this.loadFromString(arrayBufferToString(ab), 'pfv' + CRC32.crc32(ab).toString(16));
      }

      public loadFromString(s: string, uniqueId?: string): boolean {
         let load = (id: string): void => {
            let r = this.stringToNodeTree(s);
            this.initTree((): void => {
               this.uniqueId = id;
               this.faviewMode = r.faviewMode;
               if (this.onLoaded) {
                  this.onLoaded();
               }
            }, r.root);
         };
         if (uniqueId !== undefined) {
            load(uniqueId);
         } else {
            stringToArrayBuffer(s, ab => {
               load('pfv' + CRC32.crc32(ab).toString(16));
            });
         }
         return true;
      }

      private stringToNodeTree(s: string): { root: Node[], faviewMode: FaviewMode } {
         let lines = s.replace(/\r/g, '').split('\n');
         if (lines.shift() !== '[PSDToolFavorites-v1]') {
            throw new Error('given PFV file does not have a valid header');
         }

         let jb = new JSONBuilder(this.defaultRootName);
         let setting: { [name: string]: string } = {
            'root-name': this.defaultRootName,
            'faview-mode': FaviewMode.ShowFaviewAndReadme.toString(),
         };
         let name: string,
            type: string,
            data: string[] = [],
            first = true,
            value: string;
         for (let line of lines) {
            if (line === '') {
               continue;
            }
            if (line.length > 2 && line.substring(0, 2) === '//') {
               if (first) {
                  jb.root.text = setting['root-name'];
                  first = false;
               } else {
                  jb.add(name, type, data.join('\n'));
               }
               name = line.substring(2);
               if (name.indexOf('~') !== -1) {
                  data = name.split('~');
                  name = data[0];
                  type = data[1];
               } else {
                  type = 'item';
               }
               data = [];
               continue;
            }
            if (first) {
               name = line.substring(0, line.indexOf('/'));
               value = JSONBuilder.decodeName(line.substring(name.length + 1));
               if (value) {
                  setting[name] = value;
               }
            } else {
               data.push(line);
            }
         }
         if (first) {
            jb.root.text = setting['root-name'];
         } else {
            jb.add(name, type, data.join('\n'));
         }
         let faviewMode: FaviewMode;
         let n = parseInt(setting['faview-mode'], 10);
         switch (n) {
            case FaviewMode.ShowLayerTree:
            case FaviewMode.ShowFaview:
            case FaviewMode.ShowFaviewAndReadme:
               faviewMode = n;
               break;
            default:
               faviewMode = FaviewMode.ShowFaviewAndReadme;
               break;
         }
         return {
            root: jb.json,
            faviewMode: faviewMode
         };
      }
   }

   export function countEntries(pfv: string): number {
      let c = 0;
      let lines = pfv.replace(/\r/g, '').split('\n');
      lines.shift();
      for (let line of lines) {
         if (line.length > 2 && line.substring(0, 2) === '//') {
            ++c;
         }
      }
      return c;
   }

   interface SerializedFaviewDataItem {
      [itemId: string]: {
         value: string;
         lastMod: number;
      };
   }

   interface SerializedFaviewData {
      rootSelectedValue: string;
      items: {
         [rootItemId: string]: SerializedFaviewDataItem;
      };
   }

   export class Faview {
      public onChange: (node: Node) => void;
      public onRootChanged: () => void;
      get roots(): number {
         return this.treeRoots.length;
      }

      private closed_: boolean = true;
      get closed(): boolean {
         return this.closed_;
      }

      private treeRoots: HTMLLIElement[] = [];
      constructor(private favorite: Favorite, private rootSel: HTMLSelectElement, private root: HTMLUListElement) {
         root.addEventListener('click', e => this.click(e), false);
         root.addEventListener('change', e => this.change(e), false);
         root.addEventListener('input', e => this.input(e), false);
         root.addEventListener('keyup', e => this.keyup(e), false);
         rootSel.addEventListener('change', e => this.change(e), false);
         rootSel.addEventListener('keyup', e => this.keyup(e), false);
      }

      private serialize(): SerializedFaviewData {
         let result: SerializedFaviewData = {
            rootSelectedValue: this.rootSel.value,
            items: {}
         };
         for (let i = 0; i < this.treeRoots.length; ++i) {
            let item: SerializedFaviewDataItem = {};
            let selects = this.treeRoots[i].getElementsByTagName('select');
            for (let i = 0; i < selects.length; ++i) {
               item[selects[i].getAttribute('data-id')] = {
                  value: selects[i].value,
                  lastMod: parseInt(selects[i].getAttribute('data-lastmod'), 10)
               };
            }

            let opt = this.rootSel.options[i];
            if (opt instanceof HTMLOptionElement) {
               result.items[opt.value] = item;
            }
         }
         return result;
      }

      private deserialize(state: SerializedFaviewData): void {
         for (let i = 0; i < this.rootSel.length; ++i) {
            let opt = this.rootSel.options[i];
            if (opt instanceof HTMLOptionElement && opt.value in state.items) {
               let item = state.items[opt.value];
               let elems = this.treeRoots[i].getElementsByTagName('select');
               for (let i = 0; i < elems.length; ++i) {
                  let elem = elems[i];
                  if (elem instanceof HTMLSelectElement) {
                     let id = elem.getAttribute('data-id');
                     if (!(id in item)) {
                        continue;
                     }
                     for (let j = 0; j < elem.length; ++j) {
                        let opt = elem.options[j];
                        if (opt instanceof HTMLOptionElement && opt.value === item[id].value) {
                           elem.selectedIndex = j;
                           elem.setAttribute('data-lastmod', item[id].lastMod.toString());
                           let range = elem.parentElement.querySelector('input[type=range]');
                           if (range instanceof HTMLInputElement) {
                              range.value = j.toString();
                           }
                           break;
                        }
                     }
                  }
               }

               if (state.rootSelectedValue === opt.value) {
                  this.rootSel.selectedIndex = i;
               }
            }
         }
      }

      private rootChanged(): void {
         for (let i = 0; i < this.treeRoots.length; ++i) {
            if (this.rootSel.selectedIndex !== i) {
               this.treeRoots[i].style.display = 'none';
               continue;
            }

            this.treeRoots[i].style.display = 'block';
         }
         if (this.onRootChanged) {
            this.onRootChanged();
         }
      }

      private changed(select: HTMLSelectElement): void {
         select.setAttribute('data-lastmod', Date.now().toString());
         let range = select.parentElement.querySelector('input[type=range]');
         if (range instanceof HTMLInputElement) {
            range.value = select.selectedIndex.toString();
         }
         if (this.onChange) {
            this.onChange(this.favorite.get(select.value));
         }
      }

      private keyup(e: KeyboardEvent): void {
         let target = e.target;
         if (target instanceof HTMLSelectElement) {
            // it is a workaround for Firefox that does not fire change event by keyboard input
            target.blur();
            target.focus();
         }
      }

      private change(e: Event): void {
         let target = e.target;
         if (target instanceof HTMLSelectElement) {
            if (target === this.rootSel) {
               this.rootChanged();
               return;
            }
            this.changed(target);
         } else if (target instanceof HTMLInputElement && target.type === 'range') {
            let sel = target.parentElement.querySelector('select');
            if (sel instanceof HTMLSelectElement) {
               sel.selectedIndex = parseInt(target.value, 10);
               this.changed(sel);
            }
         }
      }

      private input(e: Event): void {
         let target = e.target;
         if (target instanceof HTMLInputElement && target.type === 'range') {
            let sel = target.parentElement.querySelector('select');
            if (sel instanceof HTMLSelectElement) {
               sel.selectedIndex = parseInt(target.value, 10);
               this.changed(sel);
            }
         }
      }

      private click(e: MouseEvent): void {
         let target = e.target;
         if (target instanceof HTMLButtonElement) {
            let mv = 0;
            if (target.classList.contains('psdtool-faview-prev')) {
               mv = -1;
            } else if (target.classList.contains('psdtool-faview-next')) {
               mv = 1;
            }
            if (mv === 0) {
               return;
            }
            let sel = target.parentElement.querySelector('select');
            if (sel instanceof HTMLSelectElement) {
               sel.selectedIndex = (sel.length + sel.selectedIndex + mv) % sel.length;
               sel.focus();
               this.changed(sel);
            }
         }
      }

      private addNode(n: Node, ul: HTMLUListElement): void {
         let li = document.createElement('li');
         let span = document.createElement('span');
         span.className = 'glyphicon glyphicon-asterisk';
         li.appendChild(span);
         li.appendChild(document.createTextNode(n.text.replace(/^\*?/, ' ')));
         ul.appendChild(li);

         let sel = document.createElement('select');
         sel.className = 'form-control psdtool-faview-select';
         sel.setAttribute('data-id', n.id);
         let cul = document.createElement('ul');
         let opt: HTMLOptionElement;
         let firstItemId: string;
         let numItems = 0, numChild = 0;
         for (let cn of n.children) {
            if (typeof cn !== 'string') {
               switch (cn.type) {
                  case 'item':
                     opt = document.createElement('option');
                     opt.textContent = cn.text;
                     opt.value = cn.id;
                     if (++numItems === 1) {
                        firstItemId = cn.id;
                     }
                     sel.appendChild(opt);
                     break;
                  case 'folder':
                  case 'filter':
                     this.addNode(cn, cul);
                     ++numChild;
                     break;
               }
            }
         }
         // show filtered entry only
         if (numItems > 0 && this.favorite.getFirstFilter(this.favorite.get(firstItemId)) !== '') {
            let range = document.createElement('input');
            range.type = 'range';
            range.max = (numItems - 1).toString();
            range.value = '0';
            let prev = document.createElement('button');
            prev.className = 'btn btn-default psdtool-faview-prev';
            prev.innerHTML = '&lt;';
            prev.tabIndex = -1;
            let next = document.createElement('button');
            next.className = 'btn btn-default psdtool-faview-next';
            next.innerHTML = '&gt;';
            next.tabIndex = -1;
            let fs = document.createElement('div');
            fs.className = 'psdtool-faview-select-container';
            if (numItems === 1) {
               prev.disabled = true;
               sel.disabled = true;
               range.disabled = true;
               next.disabled = true;
            }
            fs.appendChild(prev);
            fs.appendChild(sel);
            fs.appendChild(range);
            fs.appendChild(next);
            li.appendChild(fs);
         }
         if (numChild > 0) {
            li.appendChild(cul);
         }
      }

      private addRoot(nodes: Node[]): void {
         let opt: HTMLOptionElement;
         for (let n of nodes) {
            if (n.text.length > 1 && n.text.charAt(0) === '*') {
               opt = document.createElement('option');
               opt.value = n.id;
               opt.textContent = n.text.substring(1);
               this.rootSel.appendChild(opt);

               let ul = document.createElement('ul');
               for (let cn of n.children) {
                  if (typeof cn !== 'string') {
                     switch (cn.type) {
                        case 'folder':
                        case 'filter':
                           this.addNode(cn, ul);
                     }
                  }
               }

               let li = document.createElement('li');
               li.style.display = 'none';
               li.appendChild(ul);
               this.treeRoots.push(li);
               this.root.appendChild(li);

               let selects = li.getElementsByTagName('select');
               for (let i = 0; i < selects.length; ++i) {
                  selects[i].setAttribute('data-lastmod', (selects.length - i).toString());
               }
            }
            this.addRoot(n.children);
         }
      }

      public start(state?: SerializedFaviewData): void {
         this.treeRoots = [];
         this.rootSel.innerHTML = '';
         this.root.innerHTML = '';
         this.addRoot(this.favorite.json);
         if (state !== undefined) {
            this.deserialize(state);
         }
         if (this.roots > 0) {
            this.rootChanged();
         }
         this.closed_ = false;
      }

      public refresh(): void {
         this.start(this.serialize());
      }

      public getActive(): Node[] {
         let selects = this.treeRoots[this.rootSel.selectedIndex].getElementsByTagName('select');
         let items: { n: Node, lastMod: number }[] = [];
         for (let i = 0; i < selects.length; ++i) {
            items.push({
               n: this.favorite.get(selects[i].value),
               lastMod: parseInt(selects[i].getAttribute('data-lastmod'), 10)
            });
         }
         items.sort((a, b): number => a.lastMod === b.lastMod ? 0
            : a.lastMod < b.lastMod ? -1 : 1);
         let nodes: Node[] = [];
         for (let i of items) {
            nodes.push(i.n);
         }
         return nodes;
      }

      public close(): void {
         this.treeRoots = [];
         this.rootSel.innerHTML = '';
         this.root.innerHTML = '';
         this.closed_ = true;
      }
   }

   class CRC32 {
      // Based on http://stackoverflow.com/a/18639999
      private static makeCRCTable(): Uint32Array {
         let c: number, n: number, k: number;
         const crcTable = new Uint32Array(256);
         for (n = 0; n < 256; n++) {
            c = n;
            for (k = 0; k < 8; k++) {
               c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            crcTable[n] = c;
         }
         return crcTable;
      }
      private static crcTable = CRC32.makeCRCTable();
      public static crc32(src: ArrayBuffer): number {
         const crcTable = CRC32.crcTable;
         let u8a = new Uint8Array(src);
         let crc = 0 ^ (-1);
         for (let i = 0; i < u8a.length; i++) {
            crc = (crc >>> 8) ^ crcTable[(crc ^ u8a[i]) & 0xFF];
         }
         return (crc ^ (-1)) >>> 0;
      }
   }
}
