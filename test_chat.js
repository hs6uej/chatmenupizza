// test_chat.js — ทดสอบ POST /api/chat
const http = require('http');

function postChat(sessionTurn, question) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      session_id_turn: sessionTurn,
      lang: 'TH-th',
      userquestion: question
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve({ raw: body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== Test 1: Ask recommended menu ===');
  const r1 = await postChat('test001_1', 'menu recommend what do you have?');
  console.log('Response:', r1.response);
  console.log('Thought:', r1.thought);
  console.log('Time:', r1.processing_time_ms, 'ms');
  console.log();

  console.log('=== Test 2: Order pizza (same session) ===');
  const r2 = await postChat('test001_2', 'I want pepperoni pizza size L cheese crust');
  console.log('Response:', r2.response);
  console.log('Thought:', r2.thought);
  console.log('Order Action:', JSON.stringify(r2.order_action, null, 2));
  console.log('Time:', r2.processing_time_ms, 'ms');
  console.log();

  console.log('=== Test 3: Ask price (new session) ===');
  const r3 = await postChat('test002_1', 'ham cheese pizza how much?');
  console.log('Response:', r3.response);
  console.log('Time:', r3.processing_time_ms, 'ms');
  console.log();

  console.log('=== Test 4: Active Sessions ===');
  const sessRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/chat/sessions', (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
  console.log('Sessions:', sessRes);
}

main().catch(console.error);
