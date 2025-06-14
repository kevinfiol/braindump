require 'global'
local moon = require 'lib.fullmoon'

moon.setTemplate({ '/view/', tmpl = 'fmt' })
moon.get('/static/*', moon.serveAsset)

moon.get('/', function (r)
  return moon.serveContent('home')
end)

moon.run()