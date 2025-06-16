import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

import { m, mount, redraw } from 'umai';
import { Crepe } from '@milkdown/crepe';
import { state, setFileTree } from './state';
import { getSidebarWidth, saveSidebarWidth } from './util';

const RESIZE_HANDLE_CLASS = 'resize-handle';

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
  const editor = new Crepe({
    root: dom,
    defaultValue: '# hellooo lisa'
  });

  editor.create();

  return () => {
    editor.destroy();
  };
}

async function getFileTree() {
  let data = {};
  let error = undefined;

  try {
    const res = await fetch('/files');
    if (!res.ok) throw Error(`${res.status}: Could not retrieve file tree`);
    data = await res.json();
  } catch (e) {
    error = e;
  }

  return { data, error };
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
      {Object.keys(state.fileTree).length && (
        JSON.stringify(state.fileTree)
      )}
    </div>

    <div class="editor-container">
      <div class="editor" dom={mountEditor}>
      </div>
    </div>
  </div>
);

// https://keb.url.lol/flems-6-15-2025-5eca0a

mount(document.getElementById('app'), App);