const fileControllers = {};

export async function loadFile(relPath) {
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

export async function renameFile(relPath, newFilename) {
  let data = {};
  let err = undefined;

  const formData = new FormData();
  formData.append('filename', relPath);
  formData.append('new_filename', newFilename);

  try {
    let res = await fetch('/rename', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw Error(`${res.status}: Could not rename file`);
    data = await res.json();
  } catch (e) {
    err = e;
    console.error(e);
  }

  return { data, err };
}

export async function deleteFile(relPath) {
  let err = undefined;
  const formData = new FormData();
  formData.append('filename', relPath);

  try {
    let res = await fetch('/delete', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw Error(`${res.status}: Could not delete file`);
    const data = await res.json();
    if (!data.ok) throw Error('Backend error occurred during deletion. See logs');
  } catch (e) {
    err = e;
    console.error(e);
  }

  return { err };
}

export async function updateFile(relPath, content) {
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

export async function getFileTree() {
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