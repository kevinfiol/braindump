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

moon.run()