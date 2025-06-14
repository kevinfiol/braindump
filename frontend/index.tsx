// import '@milkdown/crepe/theme/common/style.css';
// import '@milkdown/crepe/theme/frame.css';

import { m, mount } from 'umai';
// import { Crepe } from '@milkdown/crepe';
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

// function mountEditor(dom) {
//   const editor = new Crepe({
//     root: dom,
//     defaultValue: '# hellooo lisa'
//   });

//   editor.create().then(() => {
//     console.log('milkdown ready');
//   });

//   return () => {
//     editor.destroy();
//   };
// }

const App = () => (
  <div class="container">
    <div class="sidebar" dom={mountResizeHandler}>
      <div class={RESIZE_HANDLE_CLASS}></div>
    </div>

    <div class="editor-container">
      <div class="editor">
        <textarea placeholder="edit your markdown">
        </textarea>
      </div>
    </div>
  </div>
);
