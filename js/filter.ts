'use strict';
module Filter {
   interface Elements {
      label: HTMLLabelElement;
      input: HTMLInputElement;
   }
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
   class Node {
      get checked(): boolean { return this.input.checked; }
      set checked(v: boolean) { this.input.checked = v; }
      get disabled(): boolean { return this.input.disabled; }
      set disabled(v: boolean) { this.input.disabled = v; }
      get name(): string { return this.name_; }
      get fullPath(): string { return this.fullPath_; }
      public children: Node[] = [];
      constructor(private input: HTMLInputElement, private name_: string, private fullPath_: string, public parent: Node) { }
   }
   export class Filter {
      private root: Node = new Node(null, '', '', null);
      private nodes: { [seqId: number]: Node } = {};
      constructor(treeRoot: HTMLUListElement, psdRoot: psd.Root) {
         let path: string[] = [];
         let r = (ul: HTMLUListElement, n: Node, l: psd.Layer[]): void => {
            for (let i = l.length - 1; i >= 0; --i) {
               path.push(Filter.encodeLayerName(l[i].Name));

               let elems = this.createElements(l[i]);
               let cn = new Node(elems.input, l[i].Name, path.join('/'), n);
               n.children.push(cn);
               this.nodes[l[i].SeqID] = cn;
               let li = document.createElement('li');
               let cul = document.createElement('ul');
               r(cul, cn, l[i].Children);
               li.appendChild(elems.label);
               li.appendChild(cul);
               ul.appendChild(li);

               path.pop();
            }
         };
         r(treeRoot, this.root, psdRoot.Children);
      }

      private createElements(l: psd.Layer): Elements {
         let input = document.createElement('input');
         input.type = 'checkbox';
         input.checked = true;
         input.setAttribute('data-seq', l.SeqID.toString());

         let label = document.createElement('label');
         label.className = 'checkbox';
         label.appendChild(input);
         label.appendChild(document.createTextNode(l.Name));
         return {
            label: label,
            input: input
         };
      }

      private getAllNode(): Node[] {
         let r: Node[] = [];
         let enableNodes = 0;
         let node: Node;
         for (let key in this.nodes) {
            if (!this.nodes.hasOwnProperty(key)) {
               continue;
            }
            node = this.nodes[key];
            if (!node.disabled) {
               ++enableNodes;
               if (node.checked) {
                  r.push(node);
               }
            }
         }
         if (r.length === enableNodes) {
            return [];
         }
         return r;
      }

      public serialize(): string {
         let nodes = this.getAllNode();
         if (!nodes.length) {
            return '';
         }
         let i: number, path: SerializeItem[] = [], pathMap: PathSet = {};
         for (i = 0; i < nodes.length; ++i) {
            path.push({
               node: nodes[i],
               fullPathSlash: nodes[i].fullPath + '/',
               index: i
            });
            pathMap[nodes[i].fullPath] = true;
         }

         path.sort((a: SerializeItem, b: SerializeItem): number => {
            return a.fullPathSlash > b.fullPathSlash ? 1 : a.fullPathSlash < b.fullPathSlash ? -1 : 0;
         });

         let j: number, parts: string[];
         for (i = 0; i < path.length; ++i) {
            // remove hidden layer
            parts = path[i].node.fullPath.split('/');
            for (j = 0; j < parts.length; ++j) {
               if (!pathMap[parts.slice(0, j + 1).join('/')]) {
                  path.splice(i--, 1);
                  j = -1;
                  break;
               }
            }
            // remove duplicated entry
            if (j !== -1 && i > 0 && path[i].fullPathSlash.indexOf(path[i - 1].fullPathSlash) === 0) {
               path.splice(--i, 1);
            }
         }

         path.sort((a: SerializeItem, b: SerializeItem): number => {
            return a.index > b.index ? 1 : a.index < b.index ? -1 : 0;
         });

         parts = [];
         for (i = 0; i < path.length; ++i) {
            parts.push(path[i].node.fullPath);
         }
         return parts.join('\n');
      }

      private buildDeserializeTree(state: string): DeserializeNode {
         let root: DeserializeNode = {
            children: {},
            checked: true
         };
         let i: number, j: number, node: DeserializeNode, parts: string[], part: string;
         let lines = state.replace(/\r/g, '').split('\n');
         for (i = 0; i < lines.length; ++i) {
            parts = lines[i].split('/');
            for (j = 0, node = root; j < parts.length; ++j) {
               part = Filter.decodeLayerName(parts[j]);
               if (!(part in node.children)) {
                  node.children[part] = {
                     children: {},
                     checked: true
                  };
               }
               node = node.children[part];
            }
         }
         return root;
      }

      private apply(dnode: DeserializeNode, fnode: Node, useDisable: boolean): void {
         let founds: PathSet = {};
         let cfnode: Node, cdnode: DeserializeNode;
         for (let i = 0; i < fnode.children.length; ++i) {
            cfnode = fnode.children[i];
            if (cfnode.disabled) {
               continue;
            }

            if (cfnode.name in founds) {
               throw new Error('found more than one same name layer: ' + cfnode.name);
            }
            founds[cfnode.name] = true;

            if (dnode) {
               cdnode = dnode.children[cfnode.name];
            }

            if (!dnode || !cdnode) {
               if (useDisable) {
                  cfnode.disabled = true;
               }
               cfnode.checked = false;
               this.apply(null, cfnode, useDisable);
               continue;
            }

            cfnode.checked = cdnode.checked;
            this.apply(cdnode, cfnode, useDisable);
         }
      }

      public deserialize(state: string, parents: string[]) {
         let old = this.serialize();
         try {
            for (let key in this.nodes) {
               if (!this.nodes.hasOwnProperty(key)) {
                  continue;
               }
               this.nodes[key].disabled = false;
               this.nodes[key].checked = true;
            }
            for (let i = parents.length - 1; i >= 0; --i) {
               this.apply(this.buildDeserializeTree(parents[i]), this.root, true);
            }

            if (state === '') {
               return;
            }

            for (let key in this.nodes) {
               if (!this.nodes.hasOwnProperty(key)) {
                  continue;
               }
               this.nodes[key].checked = false;
            }
            this.apply(this.buildDeserializeTree(state), this.root, false);
         } catch (e) {
            this.apply(this.buildDeserializeTree(old), this.root, false);
            throw e;
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
