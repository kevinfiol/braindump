import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

import { m, mount, redraw } from 'umai';
import { Crepe } from '@milkdown/crepe';
import { listenerCtx } from '@milkdown/kit/plugin/listener';
import { replaceAll, getMarkdown } from '@milkdown/kit/utils';
import { state, setFileTree } from './state';
import { getSidebarWidth, saveSidebarWidth } from './util';
import { FileTree } from './file-tree';

const RESIZE_HANDLE_CLASS = 'resize-handle';
const ref = { fileTree: undefined, editor: {}, currentFile: undefined };

function debounce(callback, wait = 350) {
  let timer;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), wait);
  };
}

function mountResizeHandler(dom) {
  const defaultWidth = getSidebarWidth();
  dom.style.width = defaultWidth + 'px';

  const handle = dom.querySelector('.' + RESIZE_HANDLE_CLASS);
  let isResizing = false;

  function handleMouseMove(ev) {
    if (!isResizing) return;
    const rect = document.querySelector('#app > .container').getBoundingClientRect();
    const newWidth = saveSidebarWidth(ev.clientX - rect.left);
    dom.style.width = newWidth + 'px';
  }

  function handleMouseUp() {
    isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  function handleMouseDown(ev) {
    isResizing = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    ev.preventDefault();
  }

  handle.addEventListener('mousedown', handleMouseDown);

  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    handle.removeEventListener('mousedown', handleMouseDown);
  };
}

function mountEditor(dom) {
  ref.editor.crepe = new Crepe({
    root: dom
  });

  const debouncedUpdateFile = debounce((relPath, content) => {
    updateFile(relPath, content);
  }, 500);

  ref.editor.crepe.create().then((ctx) => {
    ref.editor.ctx = ctx;
    ctx.action((c) => {
      const listener = c.get(listenerCtx);

      listener.markdownUpdated((_, markdown) => {
        if (!state.currentFile) return;
        debouncedUpdateFile(state.currentFile, markdown);
      });
    });
  });

  return () => {
    ref.editor.crepe.destroy();
    ref.editor = {};
  };
}

function mountFileTree(dom) {
  ref.fileTree = new FileTree(dom, state.fileTree);
  ref.fileTree.setHandlers('click', (ev, file) => {
    if (file.type === 'file') {
      loadFile(file.rel_path).then((res) => {
        const text = res.data ?? '';
        ref.editor.ctx.action(replaceAll(text));
        state.currentFile = file.rel_path;
        console.log(state);
      });
    }
  });

  return () => {
    // todo destroy filetree
    ref.fileTree = undefined;
  }
}

async function loadFile(relPath) {
  let data = '';
  let err = undefined;

  try {
    let res = await fetch(`/files/${relPath}`);
    if (!res.ok) throw Error(`${res.status}: Could not get file; does it exist?`);
    data = await res.text();
  } catch (e) {
    err = e;
  }

  return { data, err };
}

async function updateFile(relPath, content) {
  let ok = true;
  let err = undefined;

  if (updateFile.controller !== undefined)
    updateFile.controller.abort();
  updateFile.controller = new AbortController();

  const formData = new FormData();
  formData.append('content', content);

  try {
    let res = await fetch(`/files/${relPath}`, {
      method: 'POST',
      signal: updateFile.controller.signal,
      body: formData
    });

    if (!res.ok) throw Error(`${res.status}: Could not update file`)
  } catch (e) {
    ok = false;
    err = e;
    console.error(e);
  }

  return { ok, err };
}

async function getFileTree() {
  let data = {};
  let err = undefined;

  try {
    let res = await fetch('/files');
    if (!res.ok) throw Error(`${res.status}: Could not retrieve file tree`);
    data = (await res.json()).data;
  } catch (e) {
    err = e;
  }

  return { data, err };
}

// init
getFileTree()
  .then(({ data, error }) => {
    if (error) throw error;
    setFileTree(data);
  })
  .catch(console.error)
  .finally(redraw);

const App = () => (
  <div class="container">
    <div class="sidebar" dom={mountResizeHandler}>
      <div class={RESIZE_HANDLE_CLASS}></div>
      {Object.keys(state.fileTree).length > 0 &&
        <div class="file-tree" dom={mountFileTree}></div>
      }
    </div>

    <div class="editor-container">
      <div class="editor" dom={mountEditor}>
      </div>
    </div>
  </div>
);

// https://keb.url.lol/flems-6-15-2025-5eca0a

mount(document.getElementById('app'), App);