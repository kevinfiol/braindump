type BaseNode = {
  name: string;
  path: string;
  rel_path: string;
};

type Node = FileNode | DirectoryNode;

type ChildrenMap = {
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

interface Props {
  el: HTMLElement;
  data: Node;
}

interface ContextMenuItem {
  name: string;
  file?: boolean;
  directory?: boolean;
  action: (props: Props, tree: FileTree) => void;
}

export class FileTree {
  el: Element;
  elEntryMap: WeakMap<Element, Props>;
  entries: Map<string, Props>;

  focusedEl: Element | undefined;
  ctxMenuEl: Element | undefined;
  ctxMenuItems: ContextMenuItem[];

  constructor(el: Element, data: RootData) {
    this.el = el;
    this.entries = new Map;
    this.elEntryMap = new WeakMap;
    this.focusedEl = undefined;

    this.ctxMenuEl = undefined;
    this.ctxMenuItems = [];

    if (!data || data.name !== 'root' || data.type !== 'directory') {
      throw Error('Invalid file tree data');
    }

    this.el.classList.add('file-tree');
    this.mount(this.el, data.children);
  }

  mount(el: Element, children: ChildrenMap) {
    const childs = Object.values(children)
      .sort((a, b) => a.name < b.name ? 1 : -1)
      .sort((a, b) => a.type === 'file' ? 1 : -1);

    for (const e of childs) {
      if (e.type === 'file') {
        const file = this.createEntry(e);
        el.appendChild(file);
      } else if (e.type === 'directory') {
        const dir = this.createDir(e);
        this.mount(dir, e.children)  
        el.appendChild(dir);
      }
    }

    return el;
  }

  createEntry(entry: FileNode) {
    if (entry.type !== 'file') throw Error('Invalid data type for file');
    const fileEl = document.createElement('div');
    fileEl.classList.add('file-tree-node', 'file-tree-file');
    fileEl.innerText = entry.name;
    fileEl.setAttribute('draggable', 'true');

    const entryProps = { el: fileEl, data: entry };
    this.entries.set(entry.rel_path, entryProps);
    this.elEntryMap.set(fileEl, entryProps);

    return fileEl;
  }

  createDir(entry: DirectoryNode) {
    if (entry.type !== 'directory') throw Error('Invalid data type for directory');
    const dirEl = document.createElement('details');
    const dirLabel = document.createElement('summary');
    dirLabel.innerText = entry.name;
    dirLabel.classList.add('file-tree-node');

    dirEl.appendChild(dirLabel);
    dirEl.classList.add('file-tree-dir');
    dirEl.setAttribute('draggable', 'true');

    const entryProps = { el: dirEl, data: entry };
    this.entries.set(entry.rel_path, entryProps);
    this.elEntryMap.set(dirLabel, entryProps); // use the summary el as the key
    return dirEl;
  }

  remove(rel_path: string) {
    const entry = this.entries.get(rel_path);
    if (!entry) throw Error('Cannot remove entry; does not exist');

    this.elEntryMap.delete(entry.el);
    this.entries.delete(rel_path);
    entry.el.remove();
  }

  focusEntry(rel_path: string) {
    const entry = this.entries.get(rel_path);
    if (!entry) throw Error('Cannot focus on a non-existent path');
    if (entry.data.type !== 'file') throw Error('Must focus on a file entry');
    const tokens = rel_path.split('/');

    // "open" directories
    for (let i = 0, dir = ''; i < (tokens.length - 1); i++) {
      if (dir !== '') dir += '/';
      dir += tokens[i];
      const dirEntry = this.entries.get(dir);
      if (dirEntry) dirEntry.el.setAttribute('open', 'true');
    }

    if (this.focusedEl) this.focusedEl.classList.remove('focused');
    this.focusedEl = entry.el;
    entry.el.classList.add('focused');
  }

  setHandlers(event: string, handler: (ev: Event, data: Node) => void) {
    if (typeof handler !== 'function')
      throw Error('Must pass function as click handler');

    for (const entryProps of this.entries.values()) {
      const { el, data } = entryProps;
      el.addEventListener(event, (ev) => {
        handler(ev, data);
      });
    }
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
    const target = ev.target.closest('.file-tree-node');
    if (!target) return;

    const entryProps = this.elEntryMap.get(target);
    if (!entryProps) return;

    const { data } = entryProps;
    const menu = document.createElement('div');
    this.ctxMenuEl = menu;

    menu.classList.add('file-tree-context-menu');
    menu.style.top = ev.clientY + 'px';
    menu.style.left = ev.clientX + 'px';

    for (const item of this.ctxMenuItems) {
      if (!item[data.type]) continue;
      const menuItem = document.createElement('div');
      menuItem.classList.add('file-tree-context-menu-item');
      menuItem.innerText = item.name;
      menuItem.addEventListener('click', () => {
        item.action(entryProps, this);
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
