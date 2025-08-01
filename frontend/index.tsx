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



const router = navaid();
const ref = {
  fileTree: undefined,
  editor: {},
  currentFile: undefined
};

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

  ref.fileTree.setContextMenu([
    {
      name: 'New File',
      file: false,
      directory: true,
      action: (props) => {

      }
    },
    {
      name: 'Rename...',
      file: true,
      directory: false,
      action: ({ data, el }, tree) => {
        const newFilename = prompt(
          'Enter new file or folder name (.md extension is optional)',
          data.name.split('.')[0] // exclude extension
        );

        renameFile(data.rel_path, newFilename)
          .then((res) => {
            if (res.err) return;
            const newData = res.data.result;
            const newProps = { el, data: newData };

            // remove old entry
            tree.entries.delete(data.rel_path);
            // add new
            tree.entries.set(newData.rel_path, newProps);
            tree.elEntryMap.set(el, newProps);
            // update dom
            el.innerText = newData.name;

            if (state.currentFile === data.rel_path) {
              router.route(ROOT + newData.rel_path);
            }
          });
      }
    },
    {
      name: 'Delete',
      file: true,
      directory: true,
      action: (props) => {
        deleteFile(props.rel_path).then(() => {
          ref.fileTree.remove(props.rel_path);
        });
      }
    },
    {
      name: 'New Folder',
      file: false,
      directory: true,
      action: (props) => {
        
      }
    }
  ]);

  return () => {
    // todo destroy filetree
    ref.fileTree = undefined;
  }
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