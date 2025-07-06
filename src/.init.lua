require 'global'
local _ = require 'lib.lume'
local moon = require 'lib.fullmoon'
local constant = require 'constant'
local util = require 'util'

moon.setTemplate({ '/view/', tmpl = 'fmt' })
moon.get('/static/*', moon.serveAsset)
moon.get('/build/*', moon.serveAsset)
moon.get('/files/*.md', moon.serveAsset)

moon.get('/', function (r)
  return moon.serveContent('home')
end)

moon.get('/u/*', function (r)
  return moon.serveContent('home')
end)

moon.get('/files', function (r)
  local ok, result = pcall(function ()
    return util.walk(constant.FILES_DIR)
  end)

  if not ok then
    LogError('Could not create file tree')
    moon.setStatus(500)
    result = {}
  end

  return moon.serveContent('json', {
    ok = ok,
    data = result
  })
end)

moon.post('/files', function (r)
  local filename = r.params.filename
  local content = r.params.content

  local ok, result = pcall(function ()
    local fd = unix.open(
      path.join(constant.FILES_DIR, filename),
      unix.O_WRONLY | unix.O_TRUNC
    )

    unix.write(fd, content)
    unix.close(fd)
    return content
  end)

  if not ok then
    LogError('Could not edit file: ' .. filename)
    moon.setStatus(500)
    result = ''
  end

  return moon.serveContent('json', {
    ok = ok,
    data = result
  })
end)

moon.post('/rename', function (r)
  local rel_path = r.params.filename
  local new_filename = util.removeExtension(r.params.new_filename)
  new_filename = util.sanitizeFilename(new_filename) .. '.md'

  local old_filepath = path.join(constant.FILES_DIR, rel_path)
  local new_filepath = path.join(path.dirname(old_filepath), new_filename)
  local new_relpath = path.join(path.dirname(rel_path), new_filename)

  local ok = true
  local result = {
    name = new_filename,
    path = new_filepath,
    rel_path = new_relpath
  }

  if path.exists(new_filename) then
    LogError('File or directory already exists at that path: ' .. new_filepath)
    moon.setStatus(500)
    ok = false
    result = {}
  elseif not path.exists(old_filepath) then
    LogError('Original file or directory does not exist at: ' .. old_filepath)
    moon.setStatus(500)
    ok = false
    result = {}
  else
    ok = unix.rename(old_filepath, new_filepath)

    if not ok then
      moon.setStatus(500)
      result = {}
    end
  end

  return moon.serveContent('json', {
    ok = ok,
    result = result
  })
end)

moon.run()