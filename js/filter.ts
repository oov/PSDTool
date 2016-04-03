'use strict';
module LayerTree {
   interface SerializeItem {
      index: number;
      node: Node;
      fullPathSlash: string;
   }
   interface StringSet {
      [k: string]: boolean;
   }
   interface DeserializeNode {
      children: { [k: string]: DeserializeNode };
      checked: boolean;
   }
   export class Filter {
      private root: Node = new Node(null, null, '', [], 0, null);
      private nodes: { [seqId: number]: Node } = {};
      constructor(treeRoot: HTMLUListElement, psdRoot: psd.Root) {
         let path: string[] = [];
         let r = (ul: HTMLUListElement, n: Node, l: psd.Layer[]): void => {
            let indexes: { [SeqID: number]: number } = {};
            let founds: { [name: string]: number } = {};
            for (let ll of l) {
               if (ll.Name in founds) {
                  indexes[ll.SeqID] = ++founds[ll.Name];
               } else {
                  indexes[ll.SeqID] = founds[ll.Name] = 0;
               }
            }
            for (let i = l.length - 1; i >= 0; --i) {
               let elems = this.createElements(l[i]);
               let cn = new Node(elems.input, elems.text, l[i].Name, path, indexes[l[i].SeqID], n);
               n.children.push(cn);
               this.nodes[l[i].SeqID] = cn;
               cn.li = document.createElement('li');
               let cul = document.createElement('ul');
               path.push(cn.internalName);
               r(cul, cn, l[i].Children);
               path.pop();
               cn.li.appendChild(elems.label);
               cn.li.appendChild(cul);
               ul.appendChild(cn.li);
            }
         };
         r(treeRoot, this.root, psdRoot.Children);
      }

      private createElements(l: psd.Layer): {
         text: Text;
         label: HTMLLabelElement;
         input: HTMLInputElement;
      } {
         let input = document.createElement('input');
         input.type = 'checkbox';
         input.checked = true;
         input.setAttribute('data-seq', l.SeqID.toString());

         let text = document.createTextNode(l.Name);
         let label = document.createElement('label');
         label.appendChild(input);
         label.appendChild(text);
         return {
            text: text,
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
         let i: number, path: SerializeItem[] = [], pathMap: StringSet = {};
         for (i = 0; i < nodes.length; ++i) {
            path.push({
               node: nodes[i],
               fullPathSlash: nodes[i].fullPath + '/',
               index: i
            });
            pathMap[nodes[i].fullPath] = true;
         }

         path.sort((a, b): number =>
            a.fullPathSlash > b.fullPathSlash ? 1 : a.fullPathSlash < b.fullPathSlash ? -1 : 0);

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

         path.sort((a, b): number => a.index > b.index ? -1 : a.index < b.index ? 1 : 0);

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
         let node: DeserializeNode, parts: string[];
         let lines = state.replace(/\r/g, '').split('\n');
         for (let line of lines) {
            parts = line.split('/');
            node = root;
            for (let part of parts) {
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
         let founds: StringSet = {};
         let cdnode: DeserializeNode;
         for (let cfnode of fnode.children) {
            if (cfnode.disabled) {
               continue;
            }

            founds[cfnode.internalName] = true;

            if (dnode) {
               cdnode = dnode.children[cfnode.internalName];
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
               this.nodes[key].checked = false;
            }
            for (let i = parents.length - 1; i >= 0; --i) {
               this.apply(this.buildDeserializeTree(parents[i]), this.root, true);
            }

            if (state === '') {
               return;
            }

            this.apply(this.buildDeserializeTree(state), this.root, false);
         } catch (e) {
            this.apply(this.buildDeserializeTree(old), this.root, false);
            throw e;
         }
      }
   }
}
