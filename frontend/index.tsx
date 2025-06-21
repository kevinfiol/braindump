import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

import { m, mount, redraw } from 'umai';
import navaid from 'navaid';
import { Crepe } from '@milkdown/crepe';
import { listenerCtx } from '@milkdown/kit/plugin/listener';
import { replaceAll, getMarkdown } from '@milkdown/kit/utils';
import { state, setFileTree } from './state';
import { getSidebarWidth, saveSidebarWidth } from './util';
import { FileTree } from './file-tree';

const RESIZE_HANDLE_CLASS = 'resize-handle';
const ROOT = '/u/';

const router = navaid();
const fileControllers = {};
const ref = {
  fileTree: undefined,
  editor: {},
  currentFile: undefined
};

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
    root: dom,
    featureConfigs: {
      [Crepe.Feature.ImageBlock]: {
        // inlineOnUpload?: (file: File) => Promise<string>
        // onUpload?: (file: File) => Promise<string>
        inlineOnUpload: () => {}, // TODO: upload to backend
        onUpload: () => {} // TODO: upload to backend
      },
    }
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
        ref.editor.ctx.action(replaceAll(text, true));

        state.currentFile = file.rel_path;
        router.route(ROOT + file.rel_path);
        ref.fileTree.focusEntry(file.rel_path);
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
    console.error(e);
    err = e;
  }

  return { data, err };
}

async function updateFile(relPath, content) {
  let ok = true;
  let err = undefined;

  if (fileControllers[relPath] !== undefined)
    fileControllers[relPath].abort();
  fileControllers[relPath] = new AbortController();

  const formData = new FormData();
  formData.append('filename', relPath);
  formData.append('content', content);

  try {
    let res = await fetch(`/files`, {
      method: 'POST',
      signal: fileControllers[relPath].signal,
      body: formData
    });

    if (!res.ok) throw Error(`${res.status}: Could not update file`)
  } catch (e) {
    ok = false;
    err = e;
    console.error(e);
  } finally {
    delete fileControllers[relPath];
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

function initRouter() {
  router
    .on('/', () => { /* no op */ })
    .on(ROOT + '*', (params) => {
      const filePath = params.wild;
      if (!state.currentFile) {
        loadFile(filePath).then((res) => {
          const text = res.data ?? '';
          ref.editor.ctx.action(replaceAll(text, true));
          state.currentFile = filePath;
          ref.fileTree.focusEntry(filePath);
        }).catch(() => { /* no op */ });
      }
    });

  router.listen();
}

// init
getFileTree()
  .then(({ data, error }) => {
    if (error) throw error;
    setFileTree(data);
    initRouter();
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