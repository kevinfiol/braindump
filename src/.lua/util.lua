local function walk(dir, tree)
  if tree == nil and not path.isdir(dir) then
    error('Must walk a directory')
  end

  tree = tree or {
    type = 'directory',
    name = 'root',
    path = dir,
    children = {}
  }

  for name, kind in assert(unix.opendir(dir)) do
    if name ~= '.' and name ~= '..' then
      local full_path = path.join(dir, name)

      if kind == unix.DT_REG then
        tree.children[name] = {
          type = 'file',
          name = name,
          path = full_path
        }
      elseif kind == unix.DT_DIR then
        local entry = {
          type = 'directory',
          name = name,
          path = full_path,
          children = {}
        }

        tree.children[name] = entry
        walk(full_path, entry)
      end
    end
  end

  return tree
end

return {
  walk = walk
}