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
    interface DeserializeNodeRoot extends DeserializeNode {
        allLayer: boolean;
    }
    interface FilterNode {
        children: { [k: string]: FilterNode };
    }
    export const enum FlipType {
        NoFlip,
        FlipX,
        FlipY,
        FlipXY,
    }
    interface FlipSet {
        normal: Node;
        flipped: Node;
    }
    export class Node {
        get checked(): boolean { return this.input.checked; }
        set checked(v: boolean) { this.input.checked = v; }
        get disabled(): boolean { return this.input.disabled; }
        set disabled(v: boolean) { this.input.disabled = v; }
        get name(): string { return this.name_; }
        get displayName(): string { return this.displayName_.data; }
        get internalName(): string { return this.internalName_; }
        get fullPath(): string { return this.fullPath_; }
        get isRoot(): boolean { return !this.input; }
        public li: HTMLLIElement;
        public children: Node[] = [];
        public clip: Node[];
        public clippedBy: Node;
        private fullPath_: string;
        private internalName_: string;
        constructor(
            private input: HTMLInputElement,
            private displayName_: Text,
            private name_: string,
            currentPath: string[],
            indexInSameName: number,
            public parent: Node) {
            this.internalName_ = Node.encodeLayerName(this.name, indexInSameName);
            if (currentPath.length) {
                this.fullPath_ = currentPath.join('/') + '/' + this.internalName_;
            } else {
                this.fullPath_ = this.internalName_;
            }
        }

        private static encodeLayerName(s: string, index: number): string {
            return s.replace(/[\x00-\x1f\x22\x25\x27\x2f\x5c\x7e\x7f]/g, (m): string => {
                return '%' + ('0' + m[0].charCodeAt(0).toString(16)).slice(-2);
            }) + (index === 0 ? '' : '\\' + index.toString());
        }
    }
    export class LayerTree {
        public root: Node = new Node(null, null, '', [], 0, null);
        public nodes: { [seqId: number]: Node } = {};

        get text(): string {
            const text: string[] = [];
            const tab: string[] = [];
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

        private flipX: FlipSet[] = [];
        private flipY: FlipSet[] = [];
        private flipXY: FlipSet[] = [];
        private flip_ = FlipType.NoFlip;
        get flip(): FlipType { return this.flip_; }
        set flip(v: FlipType) {
            this.flip_ = v;
            this.treeRoot.classList.remove('psdtool-flip-x', 'psdtool-flip-y', 'psdtool-flip-xy');
            switch (v) {
                case FlipType.NoFlip:
                    this.doFlip(this.flipX, false);
                    this.doFlip(this.flipY, false);
                    this.doFlip(this.flipXY, false);
                    break;
                case FlipType.FlipX:
                    this.doFlip(this.flipY, false);
                    this.doFlip(this.flipXY, false);
                    this.doFlip(this.flipX, true);
                    this.treeRoot.classList.add('psdtool-flip-x');
                    break;
                case FlipType.FlipY:
                    this.doFlip(this.flipXY, false);
                    this.doFlip(this.flipX, false);
                    this.doFlip(this.flipY, true);
                    this.treeRoot.classList.add('psdtool-flip-y');
                    break;
                case FlipType.FlipXY:
                    this.doFlip(this.flipX, false);
                    this.doFlip(this.flipY, false);
                    this.doFlip(this.flipXY, true);
                    this.treeRoot.classList.add('psdtool-flip-xy');
                    break;
            }
        }

        private flipSerialize(root: Node): DeserializeNode {
            let r = (n: Node, dn: DeserializeNode): void => {
                let cdn: DeserializeNode;
                for (let cn of n.children) {
                    dn.children[cn.internalName] = cdn = {
                        checked: cn.checked,
                        children: {}
                    };
                    r(cn, cdn);
                }
            };
            const result: DeserializeNode = {
                checked: root.checked,
                children: {},
            };
            r(root, result);
            return result;
        }

        private flipDeserialize(root: Node, state: DeserializeNode): void {
            let r = (n: Node, dn: DeserializeNode): void => {
                let cdn: DeserializeNode;
                for (let cn of n.children) {
                    if (!(cn.internalName in dn.children)) {
                        continue;
                    }
                    cdn = dn.children[cn.internalName];
                    cn.checked = cdn.checked;
                    r(cn, cdn);
                }
            };
            r(root, state);
        }

        private doFlip(flipSet: FlipSet[], flip: boolean): void {
            for (let fs of flipSet) {
                if (flip && fs.normal.checked) {
                    const state = this.flipSerialize(fs.normal);
                    this.flipDeserialize(fs.flipped, state);
                    fs.flipped.checked = true;
                    fs.normal.checked = false;
                } else if (!flip && fs.flipped.checked) {
                    const state = this.flipSerialize(fs.flipped);
                    this.flipDeserialize(fs.normal, state);
                    fs.normal.checked = true;
                    fs.flipped.checked = false;
                }
            }
        }

        constructor(private disableExtendedFeature: boolean, private treeRoot: HTMLUListElement, psdRoot: psd.Root) {
            const path: string[] = [];
            let r = (ul: HTMLUListElement, n: Node, l: psd.Layer[], parentSeqID: number): void => {
                const indexes: { [SeqID: number]: number } = {};
                const founds: { [name: string]: number } = {};
                for (let ll of l) {
                    if (ll.Name in founds) {
                        indexes[ll.SeqID] = ++founds[ll.Name];
                    } else {
                        indexes[ll.SeqID] = founds[ll.Name] = 0;
                    }
                }
                for (let i = l.length - 1; i >= 0; --i) {
                    var elems = this.createElements(l[i], parentSeqID);
                    const cn = new Node(elems.input, elems.text, l[i].Name, path, indexes[l[i].SeqID], n);
                    n.children.push(cn);
                    this.nodes[l[i].SeqID] = cn;
                    const cul = document.createElement('ul');
                    path.push(cn.internalName);
                    r(cul, cn, l[i].Children, l[i].SeqID);
                    path.pop();
                    cn.li = document.createElement('li');
                    if (l[i].Folder) {
                        cn.li.classList.add('psdtool-folder');
                    }
                    cn.li.appendChild(elems.div);
                    cn.li.appendChild(cul);
                    ul.appendChild(cn.li);
                }
            };
            r(treeRoot, this.root, psdRoot.Children, -1);
            this.registerClippingGroup(psdRoot.Children);
            if (!this.disableExtendedFeature) {
                this.registerFlippingGroup();
            }
            this.normalize();
            this.flip = this.flip;
        }

        private createElements(l: psd.Layer, parentSeqID: number): {
            text: Text;
            div: HTMLDivElement;
            input: HTMLInputElement;
        } {
            const name = document.createElement('label');
            const input = document.createElement('input');
            let layerName = l.Name;
            if (!this.disableExtendedFeature && layerName.length > 1) {
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
                }
            }
            if (!input.name) {
                input.className = 'psdtool-layer-visible';
                input.name = 'l' + l.SeqID;
                input.type = 'checkbox';
                input.checked = l.Visible;
            }

            if (!this.disableExtendedFeature) {
                // trim :flipx :flipy :flipxy
                layerName = this.parseToken(layerName).name;
            }

            input.setAttribute('data-seq', l.SeqID.toString());
            name.appendChild(input);

            if (l.Clipping) {
                const clip = document.createElement('img');
                clip.className = 'psdtool-clipped-mark';
                clip.src = 'img/clipped.svg';
                clip.alt = 'clipped mark';
                name.appendChild(clip);
            }

            if (l.Folder) {
                const icon = document.createElement('span');
                icon.className = 'psdtool-icon glyphicon glyphicon-folder-open';
                icon.setAttribute('aria-hidden', 'true');
                name.appendChild(icon);
            } else {
                const thumb = document.createElement('canvas');
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
                    const ctx = thumb.getContext('2d');
                    if (!ctx) {
                        throw new Error('cannot get CanvasRenderingContext2D for make thumbnail');
                    }
                    ctx.drawImage(
                        l.Canvas, (thumb.width - w) / 2, (thumb.height - h) / 2, w, h);
                }
                name.appendChild(thumb);
            }
            const text = document.createTextNode(layerName);
            name.appendChild(text);

            const div = document.createElement('div');
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
                    n.li.classList.remove('psdtool-hidden');
                    if (n.clip) {
                        for (let i = 0; i < n.clip.length; ++i) {
                            n.clip[i].li.classList.remove('psdtool-hidden-by-clipping');
                        }
                    }
                } else {
                    n.li.classList.add('psdtool-hidden');
                    if (n.clip) {
                        for (let i = 0; i < n.clip.length; ++i) {
                            n.clip[i].li.classList.add('psdtool-hidden-by-clipping');
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

        private parseToken(name: string): { tokens: string[], name: string } {
            const token: string[] = [];
            const p = name.split(':');
            for (let i = p.length - 1; i >= 0; --i) {
                switch (p[i]) {
                    case 'flipx':
                    case 'flipy':
                    case 'flipxy':
                        token.push(p.pop());
                        break;
                    default:
                        return { tokens: token, name: p.join(':') };
                }
            }
            throw new Error('cannot parse token from name: ' + name);
        }

        private registerFlippingGroup(): void {
            let r = (n: Node): void => {
                for (let cn of n.children) {
                    r(cn);

                    const tokens = this.parseToken(cn.name);
                    const flips: FlipType[] = [];
                    for (let tk of tokens.tokens) {
                        switch (tk) {
                            case 'flipx':
                                flips.push(FlipType.FlipX);
                                break;
                            case 'flipy':
                                flips.push(FlipType.FlipY);
                                break;
                            case 'flipxy':
                                flips.push(FlipType.FlipXY);
                                break;
                        }
                    }
                    if (flips.length === 0) {
                        continue;
                    }

                    let o: Node;
                    for (let on of n.children) {
                        if (on.name === tokens.name) {
                            o = on;
                            break;
                        }
                    }
                    if (!o) {
                        continue;
                    }

                    for (let fp of flips) {
                        switch (fp) {
                            case FlipType.FlipX:
                                o.li.classList.add('psdtool-item-flip-x-orig');
                                cn.li.classList.add('psdtool-item-flip-x');
                                this.flipX.push({ normal: o, flipped: cn });
                                break;
                            case FlipType.FlipY:
                                o.li.classList.add('psdtool-item-flip-y-orig');
                                cn.li.classList.add('psdtool-item-flip-y');
                                this.flipY.push({ normal: o, flipped: cn });
                                break;
                            case FlipType.FlipXY:
                                o.li.classList.add('psdtool-item-flip-xy-orig');
                                cn.li.classList.add('psdtool-item-flip-xy');
                                this.flipXY.push({ normal: o, flipped: cn });
                                break;
                        }
                    }
                }
            };
            r(this.root);
        }

        private getAllNode(): Node[] {
            const r: Node[] = [];
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
            const nodes = this.getAllNode();
            if (!nodes.length) {
                return '';
            }
            if (allLayer) {
                const r: string[] = [];
                for (let node of nodes) {
                    r.push('/' + node.fullPath);
                }
                return r.join('\n');
            }
            let i: number;
            const items: SerializeItem[] = [], pathMap: StringSet = {};
            for (i = 0; i < nodes.length; ++i) {
                items.push({
                    node: nodes[i],
                    fullPathSlash: nodes[i].fullPath + '/',
                    index: i
                });
                pathMap[nodes[i].fullPath] = true;
            }

            items.sort((a, b): number =>
                a.fullPathSlash > b.fullPathSlash ? 1 : a.fullPathSlash < b.fullPathSlash ? -1 : 0);

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

            items.sort((a, b) => a.index > b.index ? -1 : a.index < b.index ? 1 : 0);

            parts = [];
            for (let item of items) {
                parts.push(item.node.fullPath);
            }
            return parts.join('\n');
        }

        private buildDeserializeTree(state: string): DeserializeNodeRoot {
            const allLayer = state.charAt(0) === '/';
            const root: DeserializeNodeRoot = {
                children: {},
                checked: true,
                allLayer: allLayer
            };
            let j: number, node: DeserializeNode, parts: string[];
            const lines = state.replace(/\r/g, '').split('\n');
            for (let line of lines) {
                parts = line.split('/');
                for (j = allLayer ? 1 : 0, node = root; j < parts.length; ++j) {
                    if (!(parts[j] in node.children)) {
                        node.children[parts[j]] = {
                            children: {},
                            checked: !allLayer
                        };
                    }
                    node = node.children[parts[j]];
                }
                if (allLayer) {
                    node.checked = true;
                }
            }
            return root;
        }

        private apply(dnode: DeserializeNode | null, fnode: Node, allLayer: boolean): void {
            const founds: StringSet = {};
            let cfnode: Node, cdnode: DeserializeNode;
            for (cfnode of fnode.children) {
                founds[cfnode.internalName] = true;

                if (dnode) {
                    cdnode = dnode.children[cfnode.internalName];
                }

                if (!dnode || !cdnode) {
                    cfnode.checked = false;
                    if (allLayer) {
                        this.apply(null, cfnode, allLayer);
                    }
                    continue;
                }

                if (cdnode.checked) {
                    cfnode.checked = true;
                }
                this.apply(cdnode, cfnode, allLayer);
            }
        }

        public deserialize(state: string) {
            const old = this.serialize(true);
            try {
                let t = this.buildDeserializeTree(state);
                if (t.allLayer) {
                    this.clear();
                    this.normalize();
                }
                this.apply(t, this.root, t.allLayer);
                this.flip = this.flip;
            } catch (e) {
                this.apply(this.buildDeserializeTree(old), this.root, true);
                this.flip = this.flip;
                throw e;
            }
        }

        private buildFilterTree(filter: string): FilterNode {
            const root: FilterNode = {
                children: {}
            };
            let node: FilterNode, parts: string[];
            for (let line of filter.replace(/\r/g, '').split('\n')) {
                parts = line.split('/');
                node = root;
                for (let part of parts) {
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
            const founds: StringSet = {};
            let cfnode: Node, cfilter: FilterNode, cdnode: DeserializeNode;
            for (cfnode of fnode.children) {
                founds[cfnode.internalName] = true;

                if (filter) {
                    cfilter = filter.children[cfnode.internalName];
                }
                if (!filter || !cfilter) {
                    continue;
                }

                if (dnode) {
                    cdnode = dnode.children[cfnode.internalName];
                }
                if (!dnode || !cdnode) {
                    cfnode.checked = false;
                    continue;
                }

                if (cdnode.checked) {
                    cfnode.checked = true;
                }
                this.applyWithFilter(cdnode, cfilter, cfnode);
            }
        }

        public deserializePartial(baseState: string, overlayState: string, filter: string) {
            const old = this.serialize(true);
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
                        this.apply(base, this.root, base.allLayer);
                    }
                }
                let overlay = this.buildDeserializeTree(overlayState);
                if (overlay.allLayer) {
                    throw new Error('cannot use allLayer mode in LayerTree.deserializePartial');
                }
                this.applyWithFilter(overlay, this.buildFilterTree(filter), this.root);
                this.flip = this.flip;
            } catch (e) {
                this.apply(this.buildDeserializeTree(old), this.root, true);
                this.flip = this.flip;
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
            const ul = document.getElementById('layer-tree');
            if (!ul) {
                throw new Error('#layer-tree not found');
            }
            const elems = <NodeListOf<HTMLInputElement>>ul.querySelectorAll('.psdtool-layer-force-visible');
            for (let i = 0; i < elems.length; ++i) {
                elems[i].checked = true;
            }

            const set: { [name: string]: boolean; } = {};
            const radios = ul.querySelectorAll('.psdtool-layer-radio');
            for (let i = 0; i < radios.length; ++i) {
                const radio = radios[i];
                if (!(radio instanceof HTMLInputElement)) {
                    throw new Error('found .psdtool-layer-radio that are not HTMLInputElement');
                }
                if (radio.name in set) {
                    continue;
                }
                set[radio.name] = true;
                let rinShibuyas = ul.querySelectorAll('.psdtool-layer-radio[name="' + radio.name + '"]:checked');
                if (!rinShibuyas.length) {
                    radio.checked = true;
                    continue;
                }
            }
        }
    }

    export class Filter {
        private root: Node = new Node(null, null, '', [], 0, null);
        private nodes: { [seqId: number]: Node } = {};
        constructor(treeRoot: HTMLUListElement, psdRoot: psd.Root) {
            const path: string[] = [];
            let r = (ul: HTMLUListElement, n: Node, l: psd.Layer[]): void => {
                const indexes: { [SeqID: number]: number } = {};
                const founds: { [name: string]: number } = {};
                for (let ll of l) {
                    if (ll.Name in founds) {
                        indexes[ll.SeqID] = ++founds[ll.Name];
                    } else {
                        indexes[ll.SeqID] = founds[ll.Name] = 0;
                    }
                }
                for (let i = l.length - 1; i >= 0; --i) {
                    const elems = this.createElements(l[i]);
                    const cn = new Node(elems.input, elems.text, l[i].Name, path, indexes[l[i].SeqID], n);
                    n.children.push(cn);
                    this.nodes[l[i].SeqID] = cn;
                    cn.li = document.createElement('li');
                    const cul = document.createElement('ul');
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
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = true;
            input.setAttribute('data-seq', l.SeqID.toString());

            const text = document.createTextNode(l.Name);
            const label = document.createElement('label');
            label.appendChild(input);
            label.appendChild(text);
            return {
                text: text,
                label: label,
                input: input
            };
        }

        private getAllNode(): Node[] {
            const r: Node[] = [];
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
            const nodes = this.getAllNode();
            if (!nodes.length) {
                return '';
            }
            let i: number;
            const path: SerializeItem[] = [], pathMap: StringSet = {};
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
            const root: DeserializeNode = {
                children: {},
                checked: true
            };
            let node: DeserializeNode, parts: string[];
            const lines = state.replace(/\r/g, '').split('\n');
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

        private apply(dnode: DeserializeNode | null, fnode: Node, useDisable: boolean): void {
            const founds: StringSet = {};
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
            const old = this.serialize();
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
