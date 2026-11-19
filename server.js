const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = new Set(['index.html', 'geometry.js', 'project-model.js', 'viewer3d.js', 'planner-edit.js', 'planner-extra.js', 'planner-floors.js']);
http.createServer((request, response) => {
  let name;
  try { name = request.url === '/' ? 'index.html' : decodeURIComponent(request.url.split('?')[0].slice(1)); }
  catch { response.writeHead(400).end(); return; }
  if (!files.has(name)) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8');
  fs.createReadStream(path.join(__dirname, name)).on('error', () => response.destroy()).pipe(response);
}).listen(8767, '127.0.0.1', () => console.log('http://127.0.0.1:8767/'));

