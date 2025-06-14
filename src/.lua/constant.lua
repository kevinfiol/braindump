local function stripTrailingDots(path)
  return path:match("^(.-)%.*$") or path
end

local BIN_DIR = stripTrailingDots(path.dirname(path.join(unix.getcwd(), arg[-1])))
local FILES_DIR = path.join(BIN_DIR, 'files')

return {
  FILES_DIR = FILES_DIR
}