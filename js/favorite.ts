'use strict';
module Favorite {
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

      public onClearSelection: () => void;
      public onSelect: (item: Node) => void;
      public onDoubleClick: (item: Node) => void;

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
         return buildPFV(this.json);
      }

      constructor(element: HTMLElement, private defaultRootName: string) {
         this.tree = element;
         this.jq = jQuery(this.tree);
         this.initTree();
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
         let r = (n: RenameNode[]): void => {
            for (let cn of n) {
               if (cn.originalText !== cn.text) {
                  this.jst.rename_node(cn.id, cn.text);
               }
               r(cn.children);
            }
         };
         r(nodes);
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

      public getParents(n: Node): Node[] {
         let parents: Node[] = [];
         for (let p = this.jst.get_node(n.parent); p; p = this.jst.get_node(p.parent)) {
            parents.push(p);
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

      public updateLocalStorage(): void {
         let p = this.pfv;
         let pfvs: any[] = [];
         if ('psdtool_pfv' in localStorage) {
            pfvs = JSON.parse(localStorage['psdtool_pfv']);
         }
         let found = false;
         for (let i = 0; i < pfvs.length; ++i) {
            if (pfvs[i].id === this.uniqueId && pfvs[i].hash === this.psdHash) {
               pfvs.splice(i, 1);
               found = true;
               break;
            }
         }
         if (!found && countEntries(p) === 0) {
            return;
         }
         pfvs.push({
            id: this.uniqueId,
            time: new Date().getTime(),
            hash: this.psdHash,
            data: p
         });
         while (pfvs.length > 8) {
            pfvs.shift();
         }
         localStorage['psdtool_pfv'] = JSON.stringify(pfvs);
      }

      private changedTimer = 0;
      private jstChanged(): void {
         if (this.changedTimer) {
            clearTimeout(this.changedTimer);
         }
         this.changedTimer = setTimeout(() => {
            this.changedTimer = 0;
            this.updateLocalStorage();
         }, 100);
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

      private initTree(data?: Node[]): void {
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
      }

      public loadFromArrayBuffer(ab: ArrayBuffer, uniqueId?: string): boolean {
         return this.loadFromString(arrayBufferToString(ab), uniqueId);
      }

      public loadFromLocalStorage(hash: string): boolean {
         if (!('psdtool_pfv' in localStorage)) {
            return false;
         }
         let pfv = JSON.parse(localStorage['psdtool_pfv']);
         for (var i = pfv.length - 1; i >= 0; --i) {
            if (pfv[i].hash === hash) {
               return this.loadFromString(pfv[i].data, pfv[i].id);
            }
         }
         return false;
      }

      public loadFromString(s: string, uniqueId?: string): boolean {
         this.initTree(this.stringToNodeTree(s));
         if (uniqueId !== undefined) {
            this.uniqueId = uniqueId;
         }
         return true;
      }

      private stringToNodeTree(s: string): Node[] {
         let lines = s.replace(/\r/g, '').split('\n');
         if (lines.shift() !== '[PSDToolFavorites-v1]') {
            throw new Error('given PFV file does not have a valid header');
         }

         let jb = new JSONBuilder(this.defaultRootName);
         let setting: { [name: string]: string } = {
            'root-name': this.defaultRootName
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
         return jb.json;
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

   function buildPFV(json: Node[]): string {
      if (json.length !== 1) {
         throw new Error('sorry but favorite tree data is broken');
      }

      let path: string[] = [];
      let lines = ['[PSDToolFavorites-v1]'];
      function r(children: Node[]) {
         for (let item of children) {
            path.push(JSONBuilder.encodeName(item.text));
            switch (item.type) {
               case 'root':
                  lines.push('root-name/' + path[0]);
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
      }
      r(json);
      return lines.join('\n');
   }

}
