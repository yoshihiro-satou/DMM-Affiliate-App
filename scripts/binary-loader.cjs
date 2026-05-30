// Converts binary .bin files (e.g. @vercel/og font files) to ArrayBuffer module exports.
// Required because neither Turbopack nor webpack handle .bin files by default.
function binaryLoader(content) {
  const base64 = content.toString('base64')
  return (
    'var __b64="' + base64 + '";' +
    'var __arr=typeof atob!=="undefined"' +
    '?Uint8Array.from(atob(__b64),function(c){return c.charCodeAt(0)})' +
    ':Buffer.from(__b64,"base64");' +
    'module.exports=__arr.buffer||__arr;'
  )
}
binaryLoader.raw = true
module.exports = binaryLoader
