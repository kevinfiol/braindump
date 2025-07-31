type BaseNode = {
  name: string;
  path: string;
  rel_path: string;
  el?: HTMLElement;
};

type Node = FileNode | DirectoryNode;

interface ChildrenMap {
  [key: string]: Node;
};

type FileNode = BaseNode & {
  type: 'file';
};

type DirectoryNode = BaseNode & {
  type: 'directory';
  children: ChildrenMap;
};

type RootData = DirectoryNode & {
  name: 'root';
};

type FileProps = FileNode & {
  el: HTMLElement;
};

type DirectoryProps = DirectoryNode & {
  el: HTMLElement
};

type Props = FileProps | DirectoryProps;

interface TreeMap {
  [name: string]: Props;
}

interface ContextMenuItem {
  name: string;
  file?: boolean;
  directory?: boolean;
  action: (props: Props, tree: FileTree) => void;
}

export class FileTree {
  el: Element;
  els: Set<HTMLElement>;
  elEntryMap: WeakMap<Element, Props>;
  map: ChildrenMap;

  focusedEl: Element | undefined;
  ctxMenuEl: Element | undefined;
  ctxMenuItems: ContextMenuItem[];

  constructor(el: Element, data: RootData) {
    this.el = el;
    this.els = new Set;
    this.elEntryMap = new WeakMap;
    this.focusedEl = undefined;

    this.map = {};
    this.ctxMenuEl = undefined;
    this.ctxMenuItems = [];

    if (!data || data.name !== 'root' || data.type !== 'directory') {
      throw Error('Invalid file tree data');
    }

    this.el.classList.add('file-tree');
    this.map = this.mount(this.el, data.children);
  }

  mount(el: Element, children: ChildrenMap) {
    const childs = Object.values(children)
      .sort((a, b) => a.name < b.name ? 1 : -1)
      .sort((a) => a.type === 'file' ? 1 : -1);

    for (const e of childs) {
      if (e.type === 'file') {
        const props = this.createFile(e);
        children[props.name].el = props.el;
        el.appendChild(props.el);
      } else if (e.type === 'directory') {
        const props = this.createDir(e);
        children[props.name].el = props.el;
        this.mount(props.el, e.children);
        el.appendChild(props.el);
      }
    }

    return children;
  }

  createFile(entry: FileNode) {
    const el = document.createElement('div');
    el.classList.add('file-tree-node', 'file-tree-file');
    el.innerText = entry.name;
    el.setAttribute('draggable', 'true');

    const props = { el, ...entry } as FileProps;
    this.els.add(el);
    this.elEntryMap.set(el, props);

    return props;
  }

  createDir(entry: DirectoryNode) {
    const el = document.createElement('details');
    const label = document.createElement('summary');
    label.innerText = entry.name;
    label.classList.add('file-tree-node');

    el.appendChild(label);
    el.classList.add('file-tree-dir');
    el.setAttribute('draggable', 'true');

    const props = { el, ...entry } as DirectoryProps;
    this.els.add(el);
    this.elEntryMap.set(el, props);
    return props;
  }

  getNode(path: string | string[]) {
    if (typeof path === 'string') {
      path = path.split('/');
    }

    let token = path[0];
    if (typeof token !== 'string') return;

    let node = this.map[token];
    if (!node) throw Error(`File or directory does not exist ${token}`);

    for (let i = 1; i < path.length; i++) {
      token = path[i];
      if (node.type === 'file') throw Error(`Directory does not exist: ${token}`)
      node = node.children[token];
      if (!node) throw Error(`File does not exist: ${token}`);
    }

    return node;
  }

  remove(rel_path: string) {
    const path = rel_path.split('/');
    const entry = this.getNode(path);
    if (entry === undefined) throw Error('Cannot remove entry; does not exist');

    if (entry.type === 'directory') {
      this.removeDir(entry);
    }

    this.els.delete(entry.el!);
    this.elEntryMap.delete(entry.el!);
    entry.el!.remove();

    // delete child object from map
    const filename = path.pop() as string;
    const dirEntry = this.getNode(path);
    if (dirEntry === undefined) throw Error('Cannot get directory node');
    if (dirEntry.type === 'directory') {
      delete dirEntry.children[filename];
    }

    debugger;
  }

  removeDir(node: Node) {
    if (node.type !== 'directory') {
      return;
    }

    Object.values(node.children).forEach((node) => {
      this.els.delete(node.el!);
      this.elEntryMap.delete(node.el!);
      node.el!.remove();

      if (node.type === 'directory') {
        this.removeDir(node);
      }
    });
  }

  focusEntry(rel_path: string) {
    const tokens = rel_path.split('/');
    const entry = this.getNode(tokens);

    if (!entry) throw Error('Cannot focus on a non-existent path');
    if (entry.type !== 'file') throw Error('Must focus on a file entry');

    // "open" directories
    for (let i = 0, dir = ''; i < (tokens.length - 1); i++) {
      if (dir !== '') dir += '/';
      dir += tokens[i];
      const dirEntry = this.getNode(dir);
      if (dirEntry) dirEntry.el!.setAttribute('open', 'true');
    }

    if (this.focusedEl) this.focusedEl.classList.remove('focused');
    this.focusedEl = entry.el;
    entry.el!.classList.add('focused');
  }

  setHandlers(event: string, handler: (ev: Event, data: Node) => void) {
    if (typeof handler !== 'function')
      throw Error('Must pass function as click handler');

    this.els.forEach((el) => {
      const props = this.elEntryMap.get(el);
      if (props) {
        el.addEventListener(event, (ev) => {
          handler(ev, props);
        });
      }
    });
  }

  setContextMenu(menuItems: ContextMenuItem[]) {
    if (!Array.isArray(menuItems)) throw Error('Menu items must be an array');
    this.ctxMenuItems = menuItems;
    this.el.addEventListener('contextmenu', this.handleContextMenu.bind(this));
  }

  handleContextMenu(ev: MouseEvent) {
    ev.preventDefault();
    if (this.ctxMenuEl) this.ctxMenuEl.remove();

    if (!(ev.target instanceof Element)) return;
    let target = ev.target.closest('.file-tree-node');
    if (!target) return;

    if (target.tagName === 'SUMMARY' && target.parentElement) {
      target = target.parentElement;
    }

    const props = this.elEntryMap.get(target);
    if (!props) return;

    const menu = document.createElement('div');
    this.ctxMenuEl = menu;

    menu.classList.add('file-tree-context-menu');
    menu.style.top = ev.clientY + 'px';
    menu.style.left = ev.clientX + 'px';

    for (const item of this.ctxMenuItems) {
      if (!item[props.type]) continue;
      const menuItem = document.createElement('div');
      menuItem.classList.add('file-tree-context-menu-item');
      menuItem.innerText = item.name;
      menuItem.addEventListener('click', () => {
        item.action(props, this);
        menu.remove();
      });

      menu.appendChild(menuItem);
    }

    document.body.appendChild(menu);

    const removeMenu = () => {
      menu.remove();
      document.removeEventListener('click', removeMenu);
    };

    setTimeout(() =>
      document.addEventListener('click', removeMenu), 0
    );
  }
}
