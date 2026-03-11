// debug script to check express version and route issue
const pkg = require('./node_modules/express/package.json');
console.log('Express version:', pkg.version);

// Check if routes are registered
require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());

const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'Menu JSON');

function loadJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

const menuData = {
  pizza: loadJSON('[UAT] PIZZA.json'),
  appetizers: loadJSON('[UAT] APPETIZERS.json'),
  combo: loadJSON('[UAT] COMBO.json'),
  half: loadJSON('[UAT] HALF.json'),
  promotion: loadJSON('[UAT] PROMOTION.json'),
  recommend: loadJSON('[UAT] RECOMMEND.json'),
  addonToppings: loadJSON('[UAT] ADDON_TOPPINGS.json'),
  sellingTime: loadJSON('[UAT] SELLING_TIME.json'),
};

const { buildFullMenuContext } = require('./utils/menuContext');
const menuContext = buildFullMenuContext(menuData);
console.log('Menu context length:', menuContext.length);

const GeminiService = require('./services/gemini');
const geminiService = new GeminiService(process.env.GEMINI_API_KEY, menuContext);

const createChatRoutes = require('./routes/chat');
const chatRouter = createChatRoutes(geminiService);
console.log('Chat router type:', typeof chatRouter);
console.log('Chat router is Router?', chatRouter && chatRouter.stack ? 'yes, stack length: ' + chatRouter.stack.length : 'no stack');

app.use('/api', chatRouter);

// List all registered routes
if (app._router) {
  console.log('\nRegistered routes:');
  app._router.stack.forEach(function(r) {
    if (r.route && r.route.path) {
      console.log('  ', Object.keys(r.route.methods).join(',').toUpperCase(), r.route.path);
    } else if (r.name === 'router') {
      console.log('  [Router middleware] at', r.regexp);
      if (r.handle && r.handle.stack) {
        r.handle.stack.forEach(function(sr) {
          if (sr.route) {
            console.log('    ', Object.keys(sr.route.methods).join(',').toUpperCase(), sr.route.path);
          }
        });
      }
    }
  });
}
