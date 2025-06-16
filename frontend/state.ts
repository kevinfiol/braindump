export const state = {
  fileTree: {}
};

export const setFileTree = (fileTree = {}) => {
  state.fileTree = fileTree;
};