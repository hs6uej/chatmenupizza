// Quick test to debug the 404 issue
const http = require('http');

// Test 1: GET /api/chat/sessions
const req1 = http.get('http://localhost:3000/api/chat/sessions', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('GET /api/chat/sessions');
    console.log('Status:', res.statusCode);
    console.log('Body:', body.substring(0, 300));
    console.log();

    // Test 2: POST /api/chat
    const postData = JSON.stringify({ session_id_turn: 'x_1', lang: 'TH-th', userquestion: 'hello' });
    const req2 = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res2) => {
      let body2 = '';
      res2.on('data', c => body2 += c);
      res2.on('end', () => {
        console.log('POST /api/chat');
        console.log('Status:', res2.statusCode);
        console.log('Body:', body2.substring(0, 500));
        console.log();

        // Test 3: GET /health
        http.get('http://localhost:3000/health', (res3) => {
          let body3 = '';
          res3.on('data', c => body3 += c);
          res3.on('end', () => {
            console.log('GET /health');
            console.log('Status:', res3.statusCode);
            console.log('Body:', body3.substring(0, 300));
          });
        });
      });
    });
    req2.write(postData);
    req2.end();
  });
});
req1.on('error', (e) => console.error('Connection error:', e.message));
