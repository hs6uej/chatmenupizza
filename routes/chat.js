/**
 * Chat Route — POST /api/chat
 * รับคำถามลูกค้า → Gemini AI ตอบ → ส่งกลับ
 */

const express = require('express');
const sessionStore = require('../utils/sessionStore');

/**
 * สร้าง chat routes
 * @param {Object} geminiService - instance ของ GeminiService
 */
function createChatRoutes(geminiService) {
  const router = express.Router();

  // =====================================================
  // POST /api/chat — endpoint หลัก
  // =====================================================
  router.post('/chat', async (req, res) => {
    const startTime = Date.now();

    // Validate request
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
  router.get('/chat/sessions', (req, res) => {
    res.json({
      active_sessions: sessionStore.getActiveCount(),
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

module.exports = createChatRoutes;
