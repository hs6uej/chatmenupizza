@echo off
chcp 65001 >nul
echo === Test 1: เมนูแนะนำ ===
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"session_id_turn\":\"test001_1\",\"lang\":\"TH-th\",\"userquestion\":\"menu recommend\"}"
echo.
echo.
echo === Test 2: สั่ง Pizza (same session) ===
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"session_id_turn\":\"test001_2\",\"lang\":\"TH-th\",\"userquestion\":\"I want pepperoni pizza size L cheese crust\"}"
echo.
echo.
echo === Test 3: ถามราคา (new session) ===
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"session_id_turn\":\"test002_1\",\"lang\":\"TH-th\",\"userquestion\":\"ham and cheese pizza how much?\"}"
echo.
echo.
echo === Test 4: Active Sessions ===
curl -s http://localhost:3000/api/chat/sessions
echo.
