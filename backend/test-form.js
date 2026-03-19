import http from 'http';
import fs from 'fs';
import { Buffer } from 'buffer';

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);
  console.log(req.headers);
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    console.log("BODY START");
    console.log(body.substring(0, 500));
    console.log("BODY END");
    res.end('ok');
    server.close();
  });
});
server.listen(9999, async () => {
  const buf = Buffer.from('hello world');
  const mt = 'image/jpeg';
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mt);
  form.append('file', new Blob([buf], { type: mt }), 'test.jpg');
  
  await fetch('http://localhost:9999/media', {
    method: 'POST',
    body: form
  });
});
