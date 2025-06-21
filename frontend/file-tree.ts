export class FileTree {
  constructor(el, data) {
    this.el = el;
    this.entries = new Map;
    this.focusedEl = undefined;

    if (!data || data.name !== 'root' || data.type !== 'directory') {
      throw Error('Invalid file tree data');
    }

    this.el.classList.add('file-tree');
    this.mount(this.el, data.children);
  }

  mount(el, children) {
    children = Object.values(children)
      .sort((a, b) => a.name < b.name ? 1 : -1)
      .sort((a, b) => a.type === 'file' ? 1 : -1);

    for (const e of children) {
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

  createEntry(e) {
    if (e.type !== 'file') throw Error('Invalid data type for file');
    const file = document.createElement('div');
    file.classList.add('file-tree-node', 'file-tree-file');
    file.innerText = e.name;
    file.setAttribute('draggable', true);

    this.entries.set(e.rel_path, { el: file, data: e });
    return file;
  }

  createDir(e) {
    if (e.type !== 'directory') throw Error('Invalid data type for directory');
    const dir = document.createElement('details');
    const dirLabel = document.createElement('summary');
    dirLabel.innerText = e.name;
    dirLabel.classList.add('file-tree-node');

    dir.appendChild(dirLabel);
    dir.classList.add('file-tree-dir');
    dir.setAttribute('draggable', true);

    this.entries.set(e.rel_path, { el: dir, data: e });
    return dir;
  }

  remove(rel_path) {
    const el = this.entries.get(rel_path);
    el.remove();
    this.entries.delete(rel_path);
  }

  focusEntry(rel_path) {
    const entry = this.entries.get(rel_path);
    if (!entry) throw Error('Cannot focus on a non-existent path');
    if (entry.data.type !== 'file') throw Error('Must focus on a file entry');
    const tokens = rel_path.split('/');

    // "open" directories
    for (let i = 0, dir = ''; i < (tokens.length - 1); i++) {
      if (dir !== '') dir += '/';
      dir += tokens[i];
      const dirEntry = this.entries.get(dir);
      dirEntry.el.setAttribute('open', true);
    }

    if (this.focusedEl) this.focusedEl.classList.remove('focused');
    this.focusedEl = entry.el;
    entry.el.classList.add('focused');
  }

  setHandlers(event, handler) {
    if (typeof handler !== 'function')
      throw Error('Must pass function as click handler');

    for (const e of this.entries.values()) {
      const { el, data } = e;
      el.addEventListener(event, (ev) => {
        handler(ev, data);
      });
    }
  }
}
