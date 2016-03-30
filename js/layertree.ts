'use strict';
module LayerTree {
   interface SerializeItem {
      index: number;
      node: Node;
      fullPathSlash: string;
   }
   interface PathSet {
      [k: string]: boolean;
   }
   interface DeserializeNode {
      children: { [k: string]: DeserializeNode };
      checked: boolean;
   }
   interface DeserializeNodeRoot extends DeserializeNode {
      allLayer: boolean;
   }
   interface FilterNode {
      children: { [k: string]: FilterNode };
   }
   export class Node {
      get checked(): boolean { return this.input.checked; }
      set checked(v: boolean) { this.input.checked = v; }
      get disabled(): boolean { return this.input.disabled; }
      set disabled(v: boolean) { this.input.disabled = v; }
      get name(): string { return this.name_; }
      get displayName(): string { return this.displayName_.data; }
      get fullPath(): string { return this.fullPath_; }
      get liClassList(): DOMTokenList { return this.li_.classList; }
      get isRoot(): boolean { return !this.input; }
      public children: Node[] = [];
      public clip: Node[];
      public clippedBy: Node;
      constructor(
         private input: HTMLInputElement,
         private li_: HTMLLIElement,
         private displayName_: Text,
         private name_: string,
         private fullPath_: string,
         public parent: Node) { }
   }
   export class LayerTree {
      public root: Node = new Node(null, null, null, '', '', null);
      public nodes: { [seqId: number]: Node } = {};

      get text(): string {
         let text: string[] = [];
         let tab: string[] = [];
         let r = (n: Node): void => {
            for (let cn of n.children) {
               text.push(tab.join('') + cn.name);
               tab.push('\t');
               r(cn);
               tab.pop();
            }
         };
         r(this.root);
         return text.join('\n');
      }

      constructor(private disableExtendedFeature: boolean, treeRoot: HTMLUListElement, psdRoot: psd.Root) {
         let path: string[] = [];
         let r = (ul: HTMLUListElement, n: Node, l: psd.Layer[], parentSeqID: number): void => {
            for (let i = l.length - 1; i >= 0; --i) {
               path.push(LayerTree.encodeLayerName(l[i].Name));

               let li = document.createElement('li');
               if (l[i].Folder) {
                  li.classList.add('psdtool-folder');
               }
               var elems = this.createElements(l[i], parentSeqID);
               let cn = new Node(elems.input, li, elems.text, l[i].Name, path.join('/'), n);
               n.children.push(cn);
               this.nodes[l[i].SeqID] = cn;
               let cul = document.createElement('ul');
               r(cul, cn, l[i].Children, l[i].SeqID);
               li.appendChild(elems.div);
               li.appendChild(cul);
               ul.appendChild(li);

               path.pop();
            }
         };
         r(treeRoot, this.root, psdRoot.Children, -1);
         this.registerClippingGroup(psdRoot.Children);
         this.normalize();
      }

      private createElements(l: psd.Layer, parentSeqID: number): {
         text: Text;
         div: HTMLDivElement;
         input: HTMLInputElement;
      } {
         let name = document.createElement('label');
         let input = document.createElement('input');
         let layerName = l.Name;
         if (!this.disableExtendedFeature) {
            switch (layerName.charAt(0)) {
               case '!':
                  input.className = 'psdtool-layer-visible psdtool-layer-force-visible';
                  input.name = 'l' + l.SeqID;
                  input.type = 'checkbox';
                  input.checked = true;
                  input.disabled = true;
                  input.style.display = 'none';
                  layerName = layerName.substring(1);
                  break;
               case '*':
                  input.className = 'psdtool-layer-visible psdtool-layer-radio';
                  input.name = 'r_' + parentSeqID;
                  input.type = 'radio';
                  input.checked = l.Visible;
                  layerName = layerName.substring(1);
                  break;
               default:
                  input.className = 'psdtool-layer-visible';
                  input.name = 'l' + l.SeqID;
                  input.type = 'checkbox';
                  input.checked = l.Visible;
                  break;
            }
         } else {
            input.className = 'psdtool-layer-visible';
            input.name = 'l' + l.SeqID;
            input.type = 'checkbox';
            input.checked = l.Visible;
         }
         input.setAttribute('data-seq', l.SeqID.toString());
         name.appendChild(input);

         if (l.Clipping) {
            let clip = document.createElement('img');
            clip.className = 'psdtool-clipped-mark';
            clip.src = 'img/clipped.svg';
            clip.alt = 'clipped mark';
            name.appendChild(clip);
         }

         if (l.Folder) {
            let icon = document.createElement('span');
            icon.className = 'psdtool-icon glyphicon glyphicon-folder-open';
            icon.setAttribute('aria-hidden', 'true');
            name.appendChild(icon);
         } else {
            let thumb = document.createElement('canvas');
            thumb.className = 'psdtool-thumbnail';
            thumb.width = 96;
            thumb.height = 96;
            if (l.Canvas) {
               let w = l.Width,
                  h = l.Height;
               if (w > h) {
                  w = thumb.width;
                  h = thumb.width / l.Width * h;
               } else {
                  h = thumb.height;
                  w = thumb.height / l.Height * w;
               }
               let ctx = thumb.getContext('2d');
               ctx.drawImage(
                  l.Canvas, (thumb.width - w) / 2, (thumb.height - h) / 2, w, h);
            }
            name.appendChild(thumb);
         }
         let text = document.createTextNode(layerName);
         name.appendChild(text);

         let div = document.createElement('div');
         div.className = 'psdtool-layer-name';
         div.appendChild(name);
         return {
            text: text,
            div: div,
            input: input,
         };
      }

      public updateClass(): void {
         function r(n: Node): void {
            if (n.checked) {
               n.liClassList.remove('psdtool-hidden');
               if (n.clip) {
                  for (let i = 0; i < n.clip.length; ++i) {
                     n.clip[i].liClassList.remove('psdtool-hidden-by-clipping');
                  }
               }
            } else {
               n.liClassList.add('psdtool-hidden');
               if (n.clip) {
                  for (let i = 0; i < n.clip.length; ++i) {
                     n.clip[i].liClassList.add('psdtool-hidden-by-clipping');
                  }
               }
            }
            for (let i = 0; i < n.children.length; ++i) {
               r(n.children[i]);
            }
         }
         for (let i = 0; i < this.root.children.length; ++i) {
            r(this.root.children[i]);
         }
      }

      private registerClippingGroup(l: psd.Layer[]): void {
         let clip: Node[] = [];
         let n: Node;
         for (let i = l.length - 1; i >= 0; --i) {
            this.registerClippingGroup(l[i].Children);
            n = this.nodes[l[i].SeqID];
            if (l[i].Clipping) {
               clip.unshift(n);
            } else {
               if (clip.length) {
                  for (let j = 0; j < clip.length; ++j) {
                     clip[j].clippedBy = n;
                  }
                  n.clip = clip;
               }
               clip = [];
            }
         }
      }

      private getAllNode(): Node[] {
         let r: Node[] = [];
         let node: Node;
         for (let key in this.nodes) {
            if (!this.nodes.hasOwnProperty(key)) {
               continue;
            }
            node = this.nodes[key];
            if (node.checked) {
               r.push(node);
            }
         }
         return r;
      }

      public serialize(allLayer: boolean): string {
         let nodes = this.getAllNode();
         if (!nodes.length) {
            return '';
         }
         if (allLayer) {
            let r: string[] = [];
            for (let node of nodes) {
               r.push('/' + node.fullPath);
            }
            return r.join('\n');
         }
         let i: number, items: SerializeItem[] = [], pathMap: PathSet = {};
         for (i = 0; i < nodes.length; ++i) {
            items.push({
               node: nodes[i],
               fullPathSlash: nodes[i].fullPath + '/',
               index: i
            });
            pathMap[nodes[i].fullPath] = true;
         }

         items.sort((a: SerializeItem, b: SerializeItem): number => {
            return a.fullPathSlash > b.fullPathSlash ? 1 : a.fullPathSlash < b.fullPathSlash ? -1 : 0;
         });

         let j: number, parts: string[];
         for (i = 0; i < items.length; ++i) {
            // remove hidden layer
            parts = items[i].node.fullPath.split('/');
            for (j = 0; j < parts.length; ++j) {
               if (!pathMap[parts.slice(0, j + 1).join('/')]) {
                  items.splice(i--, 1);
                  j = -1;
                  break;
               }
            }
            // remove duplicated entry
            if (j !== -1 && i > 0 && items[i].fullPathSlash.indexOf(items[i - 1].fullPathSlash) === 0) {
               items.splice(--i, 1);
            }
         }

         items.sort((a: SerializeItem, b: SerializeItem): number => {
            return a.index > b.index ? 1 : a.index < b.index ? -1 : 0;
         });

         parts = [];
         for (let item of items) {
            parts.push(item.node.fullPath);
         }
         return parts.join('\n');
      }

      private buildDeserializeTree(state: string): DeserializeNodeRoot {
         let allLayer = state.charAt(0) === '/';
         let root: DeserializeNodeRoot = {
            children: {},
            checked: true,
            allLayer: allLayer
         };
         let j: number, node: DeserializeNode, parts: string[], part: string;
         let lines = state.replace(/\r/g, '').split('\n');
         for (let line of lines) {
            parts = line.split('/');
            for (j = allLayer ? 1 : 0, node = root; j < parts.length; ++j) {
               part = LayerTree.decodeLayerName(parts[j]);
               if (!(part in node.children)) {
                  node.children[part] = {
                     children: {},
                     checked: !allLayer
                  };
               }
               node = node.children[part];
            }
            if (allLayer) {
               node.checked = true;
            }
         }
         return root;
      }

      private apply(dnode: DeserializeNode, fnode: Node): void {
         let founds: PathSet = {};
         let cfnode: Node, cdnode: DeserializeNode;
         for (cfnode of fnode.children) {
            if (cfnode.name in founds) {
               throw new Error('found more than one same name layer: ' + cfnode.name);
            }
            founds[cfnode.name] = true;

            if (dnode) {
               cdnode = dnode.children[cfnode.name];
            }

            if (!dnode || !cdnode) {
               cfnode.checked = false;
               this.apply(null, cfnode);
               continue;
            }

            if (cdnode.checked) {
               cfnode.checked = true;
            }
            this.apply(cdnode, cfnode);
         }
      }

      public deserialize(state: string) {
         let old = this.serialize(true);
         try {
            let t = this.buildDeserializeTree(state);
            if (t.allLayer) {
               this.clear();
               this.normalize();
            }
            this.apply(t, this.root);
         } catch (e) {
            this.clear();
            this.normalize();
            this.apply(this.buildDeserializeTree(old), this.root);
            throw e;
         }
      }

      private buildFilterTree(filter: string): FilterNode {
         let root: FilterNode = {
            children: {}
         };
         let node: FilterNode, parts: string[];
         for (let line of filter.replace(/\r/g, '').split('\n')) {
            parts = line.split('/');
            node = root;
            for (let part of parts) {
               part = LayerTree.decodeLayerName(part); // TODO: use Filter.decodeLayerName
               if (!(part in node.children)) {
                  node.children[part] = {
                     children: {}
                  };
               }
               node = node.children[part];
            }
         }
         return root;
      }

      private applyWithFilter(dnode: DeserializeNode, filter: FilterNode, fnode: Node): void {
         let founds: PathSet = {};
         let cfnode: Node, cfilter: FilterNode, cdnode: DeserializeNode;
         for (cfnode of fnode.children) {
            if (cfnode.name in founds) {
               throw new Error('found more than one same name layer: ' + cfnode.name);
            }
            founds[cfnode.name] = true;

            if (filter) {
               cfilter = filter.children[cfnode.name];
            }
            if (!filter || !cfilter) {
               continue;
            }

            if (dnode) {
               cdnode = dnode.children[cfnode.name];
            }
            if (!dnode || !cdnode) {
               cfnode.checked = false;
               this.applyWithFilter(null, cfilter, cfnode);
               continue;
            }

            if (cdnode.checked) {
               cfnode.checked = true;
            }
            this.applyWithFilter(cdnode, cfilter, cfnode);
         }
      }

      public deserializePartial(baseState: string, overlayState: string, filter: string) {
         let old = this.serialize(true);
         try {
            if (baseState !== undefined) {
               if (baseState === '') {
                  this.clear();
               } else {
                  let base = this.buildDeserializeTree(baseState);
                  if (base.allLayer) {
                     this.clear();
                     this.normalize();
                  }
                  this.apply(base, this.root);
               }
            }
            let overlay = this.buildDeserializeTree(overlayState);
            if (overlay.allLayer) {
               throw new Error('cannot use allLayer mode in LayerTree.deserializePartial');
            }
            this.applyWithFilter(overlay, this.buildFilterTree(filter), this.root);
         } catch (e) {
            this.clear();
            this.normalize();
            this.apply(this.buildDeserializeTree(old), this.root);
            throw e;
         }
      }

      private clear(): void {
         for (let key in this.nodes) {
            if (!this.nodes.hasOwnProperty(key)) {
               continue;
            }
            this.nodes[key].checked = false;
         }
      }

      private normalize(): void {
         // TODO: re-implement
         let ul = document.getElementById('layer-tree');
         let elems = <NodeListOf<HTMLInputElement>>ul.querySelectorAll('.psdtool-layer-force-visible');
         for (let i = 0; i < elems.length; ++i) {
            elems[i].checked = true;
         }

         let set: { [name: string]: boolean; } = {};
         let radios = <NodeListOf<HTMLInputElement>>ul.querySelectorAll('.psdtool-layer-radio');
         for (let i = 0; i < radios.length; ++i) {
            if (radios[i].name in set) {
               continue;
            }
            set[radios[i].name] = true;
            let rinShibuyas = ul.querySelectorAll('.psdtool-layer-radio[name="' + radios[i].name + '"]:checked');
            if (!rinShibuyas.length) {
               radios[i].checked = true;
               continue;
            }
         }
      }

      private static encodeLayerName(s: string): string {
         return s.replace(/[\x00-\x1f\x22\x25\x27\x2f\x5c\x7e\x7f]/g, (m): string => {
            return '%' + ('0' + m[0].charCodeAt(0).toString(16)).slice(-2);
         });
      }

      private static decodeLayerName(s: string): string {
         return decodeURIComponent(s);
      }
   }
}
