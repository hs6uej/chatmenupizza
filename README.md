# 🍕 Pizza Menu API + AI Chat Bot

REST API + AI Chat Bot (Gemini) สำหรับระบบสั่งพิซซ่า

## Quick Start

```bash
# Clone
git clone https://github.com/hs6ucj/chatmenupizza.git
cd chatmenupizza

# สร้าง .env
cat > .env << EOF
GEMINI_API_KEY=your_gemini_api_key_here
PORT=4060
EOF

# Run with Docker
docker compose up -d --build

# Check
curl http://localhost:4060/health
```

---

## API Endpoints

### 🤖 POST `/api/chat` — AI Chat (Endpoint หลัก)

ส่งคำถามลูกค้า → AI ตอบเป็นภาษาไทย + จำบทสนทนาตาม session

**Request:**
```http
POST /api/chat
Content-Type: application/json
```

```json
{
  "session_id_turn": "string (required) — รูปแบบ: uuid_turnNumber เช่น abc123_1",
  "lang": "string (optional) — default: TH-th",
  "userquestion": "string (required) — คำถามจากลูกค้า"
}
```

**Response — ถามข้อมูลเมนู:**
```json
{
  "session_id_turn": "abc123_1",
  "lang": "TH-th",
  "response": "เมนูแนะนำของเราตอนนี้มีโปรโมชั่น...",
  "thought": "ลูกค้าถามเมนูแนะนำ → ดึงข้อมูล RECOMMEND",
  "order_action": null,
  "processing_time_ms": 2580
}
```

**Response — สั่งอาหาร:**
```json
{
  "session_id_turn": "abc123_3",
  "lang": "TH-th",
  "response": "รับออเดอร์ค่ะ! พิซซ่า Pepperoni ขนาด L ขอบชีส ราคา 529 บาท",
  "thought": "ลูกค้าสั่ง Pepperoni L ขอบชีส → คำนวณราคา",
  "order_action": {
    "action": "add_item",
    "items": [
      {
        "code": "PPI",
        "name": "เปปเปอโรนี",
        "size": "L",
        "crust": "ขอบชีส",
        "base_price": 399,
        "crust_price": 130,
        "total_price": 529,
        "quantity": 1,
        "extra_toppings": []
      }
    ]
  },
  "processing_time_ms": 2547
}
```

**order_action types:**

| action | เมื่อไร |
|--------|---------|
| `add_item` | ลูกค้าสั่งสินค้า |
| `confirm_order` | ลูกค้ายืนยัน order |
| `cancel_order` | ลูกค้ายกเลิก order |
| `null` | แค่ถาม ไม่ได้สั่ง |

---

### Session Memory

- bot จำบทสนทนาตาม **session_id** (ส่วนก่อน `_` ตัวสุดท้ายของ `session_id_turn`)
- เก็บ history สูงสุด **20 turns** ต่อ session
- Auto-cleanup session ที่ไม่ใช้เกิน **30 นาที**

**ตัวอย่างการใช้ session:**
```
session_id_turn: "abc123_1"  →  session_id = "abc123", turn = 1
session_id_turn: "abc123_2"  →  session_id = "abc123", turn = 2 (จำบทสนทนาก่อนหน้า)
session_id_turn: "xyz789_1"  →  session_id = "xyz789", turn = 1 (session ใหม่)
```

---

### Error Responses

**400 — Missing fields:**
```json
{
  "success": false,
  "error": "Missing required field: userquestion",
  "timestamp": "2026-03-11T10:00:00.000Z"
}
```

**500 — Server error:**
```json
{
  "session_id_turn": "abc123_1",
  "lang": "TH-th",
  "response": "ขออภัยค่ะ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งนะคะ",
  "thought": "Error: ...",
  "order_action": null,
  "processing_time_ms": 150
}
```

---

## Menu Data Endpoints

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| `GET` | `/api/menu` | รายการ group ทั้งหมด |
| `GET` | `/api/menu/:group` | ข้อมูลเมนูตาม group (`pizza`, `appetizers`, `combo`, `half`, `promotion`, `recommend`) |
| `GET` | `/api/menu/:group/:itemCode` | ข้อมูลสินค้าตัวเดียว เช่น `/api/menu/pizza/HCE` |
| `GET` | `/api/promotions` | โปรโมชันทั้งหมด |
| `GET` | `/api/combos` | คอมโบทั้งหมด |
| `GET` | `/api/recommend` | เมนูแนะนำ |
| `GET` | `/api/toppings` | ท็อปปิ้ง (filter: `?size=M`) |
| `GET` | `/api/half-half` | พิซซ่าครึ่ง-ครึ่ง |
| `GET` | `/api/selling-time` | ช่วงเวลาขาย |
| `GET` | `/api/chat/sessions` | จำนวน active sessions |
| `GET` | `/health` | Health check |

---

## curl ตัวอย่าง

```bash
# ถามเมนูแนะนำ
curl -X POST http://localhost:4060/api/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id_turn":"s001_1","lang":"TH-th","userquestion":"เมนูแนะนำมีอะไรบ้าง"}'

# สั่งพิซซ่า (same session)
curl -X POST http://localhost:4060/api/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id_turn":"s001_2","lang":"TH-th","userquestion":"สั่ง pepperoni ขนาด L ขอบชีส"}'

# ถามราคา (new session)
curl -X POST http://localhost:4060/api/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id_turn":"s002_1","lang":"TH-th","userquestion":"Ham and Cheese ราคาเท่าไร"}'

# ดูเมนูพิซซ่าทั้งหมด
curl http://localhost:4060/api/menu/pizza

# ดูข้อมูล item เดียว
curl http://localhost:4060/api/menu/pizza/HCE

# ดูท็อปปิ้งขนาด M
curl http://localhost:4060/api/toppings?size=M

# Health check
curl http://localhost:4060/health
```
