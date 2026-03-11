/**
 * Gemini AI Service — เชื่อมต่อ Gemini API สำหรับ Pizza Bot
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `คุณเป็น "Pizza Bot" พนักงานรับออเดอร์พิซซ่าที่เป็นมิตร สุภาพ ร่าเริง
คุณตอบเป็นภาษาไทย ใช้คำลงท้ายว่า "ค่ะ" หรือ "นะคะ"

## กฎสำคัญ:
1. ตอบเฉพาะเรื่องเมนูอาหาร ราคา โปรโมชัน และการสั่งซื้อเท่านั้น
2. ใช้ข้อมูลจาก "ข้อมูลเมนู" ที่ให้ไว้เท่านั้น ห้ามแต่งข้อมูลเอง
3. ถ้าไม่มีข้อมูลเพียงพอ ให้บอกตรงๆ ว่าไม่มีข้อมูล
4. ถ้าลูกค้าถามเรื่องที่ไม่เกี่ยวกับเมนู/ออเดอร์ ให้สุภาพปฏิเสธและนำกลับมาเรื่องอาหาร
5. เมื่อลูกค้าสั่งอาหาร ให้ทวนรายการและราคาเสมอ
6. คำนวณราคาพิซซ่า = ราคาขนาด + ราคาครัสต์ (ถ้ามี)

## วิธีตอบ:
คุณต้องตอบเป็น JSON format เสมอ ดังนี้:

{
  "response": "ข้อความตอบลูกค้า",
  "thought": "เหตุผลสั้นๆ ว่าคิดอะไร ทำอะไร",
  "order_action": null หรือ object ถ้ามีการสั่ง
}

## order_action format (ใช้เมื่อลูกค้าสั่งของ):
{
  "action": "add_item",
  "items": [
    {
      "code": "รหัสสินค้า",
      "name": "ชื่อสินค้า",
      "size": "ขนาด (S/M/L/REG)",
      "crust": "ครัสต์ (ถ้าเป็นพิซซ่า) หรือ null",
      "base_price": ราคาขนาด,
      "crust_price": ราคาครัสต์ หรือ 0,
      "total_price": ราคารวม,
      "quantity": จำนวน,
      "extra_toppings": [] หรือ [{code, name, price}]
    }
  ]
}

## ถ้าลูกค้ายืนยันออเดอร์:
{
  "action": "confirm_order",
  "items": [รายการทั้งหมด]
}

## ถ้าลูกค้ายกเลิก:
{
  "action": "cancel_order"
}

ตอบเป็น JSON เท่านั้น ห้ามใส่ markdown code block ห้ามใส่ \`\`\`json`;

class GeminiService {
  constructor(apiKey, menuContext) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.menuContext = menuContext;
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    });
  }

  /**
   * ส่งข้อความไป Gemini พร้อม context และ history
   * @param {string} userMessage - ข้อความจากลูกค้า
   * @param {Array} history - ประวัติสนทนา [{role, content}, ...]
   * @returns {Object} { response, thought, order_action }
   */
  async chat(userMessage, history = []) {
    // สร้าง prompt
    const fullPrompt = this.buildPrompt(userMessage, history);

    try {
      const result = await this.model.generateContent(fullPrompt);
      const responseText = result.response.text().trim();

      // พยายาม parse JSON
      return this.parseResponse(responseText);
    } catch (error) {
      console.error('❌ Gemini API Error:', error.message);
      return {
        response: 'ขออภัยค่ะ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งนะคะ',
        thought: `Error: ${error.message}`,
        order_action: null
      };
    }
  }

  buildPrompt(userMessage, history) {
    let prompt = SYSTEM_PROMPT + '\n\n';
    prompt += '# ข้อมูลเมนู\n\n';
    prompt += this.menuContext + '\n\n';

    if (history.length > 0) {
      prompt += '# ประวัติสนทนา\n';
      for (const msg of history) {
        const role = msg.role === 'user' ? 'ลูกค้า' : 'Bot';
        prompt += `${role}: ${msg.content}\n`;
      }
      prompt += '\n';
    }

    prompt += `# คำถามล่าสุดของลูกค้า\nลูกค้า: ${userMessage}\n\n`;
    prompt += 'ตอบเป็น JSON:';

    return prompt;
  }

  parseResponse(responseText) {
    try {
      // ลอง parse JSON ตรงๆ
      let cleaned = responseText;
      // ลบ markdown code block ถ้ามี
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

      const parsed = JSON.parse(cleaned);
      return {
        response: parsed.response || '',
        thought: parsed.thought || '',
        order_action: parsed.order_action || null
      };
    } catch (e) {
      // ถ้า parse ไม่ได้ ส่งข้อความดิบกลับ
      console.warn('⚠️ Could not parse Gemini response as JSON:', responseText.substring(0, 200));
      return {
        response: responseText,
        thought: 'Response was not valid JSON, returning raw text',
        order_action: null
      };
    }
  }
}

module.exports = GeminiService;
