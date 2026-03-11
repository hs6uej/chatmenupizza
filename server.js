require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const createMenuRoutes = require('./routes/menu');
const GeminiService = require('./services/gemini');
const { buildFullMenuContext } = require('./utils/menuContext');
const sessionStore = require('./utils/sessionStore');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// Middleware
// =====================================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// โหลดข้อมูลเมนูจากไฟล์ JSON
// =====================================================
const DATA_DIR = path.join(__dirname, 'Menu JSON');

function loadJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Error loading ${filename}:`, err.message);
    return {};
  }
}

console.log('📂 Loading menu data...');
const menuData = {
  pizza:         loadJSON('[UAT] PIZZA.json'),
  appetizers:    loadJSON('[UAT] APPETIZERS.json'),
  combo:         loadJSON('[UAT] COMBO.json'),
  half:          loadJSON('[UAT] HALF.json'),
  promotion:     loadJSON('[UAT] PROMOTION.json'),
  recommend:     loadJSON('[UAT] RECOMMEND.json'),
  addonToppings: loadJSON('[UAT] ADDON_TOPPINGS.json'),
  sellingTime:   loadJSON('[UAT] SELLING_TIME.json'),
};
console.log('✅ Menu data loaded successfully!');

// =====================================================
// สร้าง Menu Context สำหรับ AI
// =====================================================
console.log('🧠 Building menu context for AI...');
const menuContext = buildFullMenuContext(menuData);
console.log(`✅ Menu context ready! (${menuContext.length} characters)`);

// =====================================================
// สร้าง Gemini Service
// =====================================================
let geminiService = null;
if (process.env.GEMINI_API_KEY) {
  geminiService = new GeminiService(process.env.GEMINI_API_KEY, menuContext);
  console.log('🤖 Gemini AI service initialized!');
} else {
  console.warn('⚠️ GEMINI_API_KEY not found in .env — Chat endpoint will not work');
}

// =====================================================
// Menu Routes (via router)
// =====================================================
app.use('/api', createMenuRoutes(menuData));

// =====================================================
// POST /api/chat — AI Chat endpoint (registered directly)
// =====================================================
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();

  if (!geminiService) {
    return res.status(503).json({
      success: false,
      error: 'Gemini AI service is not configured. Set GEMINI_API_KEY in .env',
      timestamp: new Date().toISOString()
    });
  }

  const { session_id_turn, lang, userquestion } = req.body;

  if (!session_id_turn) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: session_id_turn',
      timestamp: new Date().toISOString()
    });
  }

  if (!userquestion || userquestion.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: userquestion',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // 1. ดึง conversation history
    const history = sessionStore.getHistory(session_id_turn);

    // 2. ส่งไป Gemini
    console.log(`💬 [${session_id_turn}] Q: ${userquestion}`);
    const aiResult = await geminiService.chat(userquestion, history);

    // 3. บันทึก history
    sessionStore.addMessage(session_id_turn, 'user', userquestion);
    sessionStore.addMessage(session_id_turn, 'assistant', aiResult.response);

    const elapsed = Date.now() - startTime;
    console.log(`✅ [${session_id_turn}] A: ${aiResult.response.substring(0, 80)}... (${elapsed}ms)`);

    // 4. ตอบกลับ
    res.json({
      session_id_turn,
      lang: lang || 'TH-th',
      response: aiResult.response,
      thought: aiResult.thought,
      order_action: aiResult.order_action,
      processing_time_ms: elapsed
    });

  } catch (error) {
    console.error(`❌ [${session_id_turn}] Error:`, error.message);
    res.status(500).json({
      session_id_turn,
      lang: lang || 'TH-th',
      response: 'ขออภัยค่ะ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งนะคะ',
      thought: `Error: ${error.message}`,
      order_action: null,
      processing_time_ms: Date.now() - startTime
    });
  }
});

// =====================================================
// GET /api/chat/sessions — ดูจำนวน active sessions
// =====================================================
app.get('/api/chat/sessions', (req, res) => {
  res.json({
    active_sessions: sessionStore.getActiveCount(),
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// Health check
// =====================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    gemini: geminiService ? 'connected' : 'not configured',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Root - API documentation
app.get('/', (req, res) => {
  const endpoints = [
    { method: 'POST', path: '/api/chat',                  description: '🤖 AI Chat — ถามเมนู/สั่งอาหาร (Gemini AI)' },
    { method: 'GET',  path: '/api/chat/sessions',          description: 'ดูจำนวน active sessions' },
    { method: 'GET',  path: '/api/menu',                   description: 'List all menu groups' },
    { method: 'GET',  path: '/api/menu/:group',            description: 'Get menu by group' },
    { method: 'GET',  path: '/api/menu/:group/:itemCode',  description: 'Get specific item by code' },
    { method: 'GET',  path: '/api/promotions',             description: 'Get all promotions' },
    { method: 'GET',  path: '/api/combos',                 description: 'Get all combos' },
    { method: 'GET',  path: '/api/recommend',              description: 'Get recommended items' },
    { method: 'GET',  path: '/api/toppings',               description: 'Get addon toppings (?size=M)' },
    { method: 'GET',  path: '/api/half-half',              description: 'Get half-half pizza menu' },
    { method: 'GET',  path: '/api/selling-time',           description: 'Get selling time schedules' },
    { method: 'GET',  path: '/health',                     description: 'Health check' },
  ];

  res.json({
    name: 'Pizza Menu API + AI Chat Bot',
    version: '2.0.0',
    endpoints,
    chat_usage: {
      method: 'POST',
      url: '/api/chat',
      body: {
        session_id_turn: 'uuid_turnNumber',
        lang: 'TH-th',
        userquestion: 'เมนูแนะนำมีอะไรบ้าง'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint '${req.method} ${req.path}' not found. Visit / for available endpoints.`,
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// Start server
// =====================================================
app.listen(PORT, () => {
  console.log(`\n🍕 Pizza Menu API + AI Chat Bot is running!`);
  console.log(`   Local:  http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Docs:   http://localhost:${PORT}/`);
  console.log(`   Chat:   POST http://localhost:${PORT}/api/chat\n`);
});
