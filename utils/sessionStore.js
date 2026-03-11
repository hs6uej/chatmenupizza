/**
 * Session Store — เก็บ conversation history per session_id (in-memory)
 * Auto-cleanup sessions ที่ไม่ใช้เกิน 30 นาที
 */

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 นาที
const MAX_HISTORY = 20; // จำกัด 20 turns ต่อ session

class SessionStore {
  constructor() {
    this.sessions = new Map();

    // Auto-cleanup ทุก 5 นาที
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * ดึง session_id จาก session_id_turn (ตัด _turn ออก)
   */
  parseSessionId(sessionIdTurn) {
    // format: "uuid_turn" — เอาเฉพาะ uuid ส่วนแรก
    const parts = sessionIdTurn.split('_');
    // ถ้ามี _ ให้เอาทุกส่วนยกเว้นส่วนสุดท้าย (ซึ่งเป็น turn number)
    if (parts.length > 1) {
      return parts.slice(0, -1).join('_');
    }
    return sessionIdTurn;
  }

  /**
   * ดึง history ของ session
   */
  getHistory(sessionIdTurn) {
    const sessionId = this.parseSessionId(sessionIdTurn);
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    session.lastActive = Date.now();
    return session.messages;
  }

  /**
   * เพิ่ม message เข้า session
   */
  addMessage(sessionIdTurn, role, content) {
    const sessionId = this.parseSessionId(sessionIdTurn);
    let session = this.sessions.get(sessionId);

    if (!session) {
      session = { messages: [], lastActive: Date.now() };
      this.sessions.set(sessionId, session);
    }

    session.messages.push({ role, content });
    session.lastActive = Date.now();

    // จำกัดจำนวน history
    if (session.messages.length > MAX_HISTORY * 2) {
      // เก็บเฉพาะ messages ล่าสุด
      session.messages = session.messages.slice(-MAX_HISTORY * 2);
    }
  }

  /**
   * ล้าง sessions ที่หมดอายุ
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActive > SESSION_TTL_MS) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired sessions. Active: ${this.sessions.size}`);
    }
  }

  /**
   * ดูจำนวน active sessions
   */
  getActiveCount() {
    return this.sessions.size;
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton
const sessionStore = new SessionStore();

module.exports = sessionStore;
