/**
 * แปลงข้อมูลเมนู JSON ดิบ → ข้อความสรุปสั้นสำหรับส่ง Gemini
 * ลดจาก ~14,000 บรรทัด → ~200-300 บรรทัด
 */

function buildPizzaContext(pizzaData) {
  if (!pizzaData || !pizzaData.categories) return '';

  let text = '## เมนูพิซซ่า (PIZZA)\n';
  for (const cat of pizzaData.categories) {
    text += `\n### หมวด: ${cat.name_th} (${cat.name_en})\n`;
    if (!cat.items) continue;
    for (const item of cat.items) {
      const sizes = (item.subitems || []).map(s => {
        const crustInfo = (s.crust || []).map(c => `${c.crust_name_th || c.crust_code}(+${c.price}฿)`).join(', ');
        return `${s.sizename_th}(${s.sizecode}): ${s.price}฿ [ครัสต์: ${crustInfo}]`;
      }).join(' | ');
      const toppings = (item.default_topping || []).map(t => t.name_th).join(', ');
      const filterType = (item.filter_type || []).join(', ');
      text += `- **${item.name_th}** (${item.name_en}) [code: ${item.code}] — ${item.description_th || ''}\n`;
      text += `  ขนาด/ราคา: ${sizes}\n`;
      if (toppings) text += `  ท็อปปิ้ง: ${toppings}\n`;
      if (filterType) text += `  ประเภท: ${filterType}\n`;
    }
  }
  return text;
}

function buildAppetizersContext(appData) {
  if (!appData || !appData.categories) return '';

  let text = '## เมนูอื่นๆ (APPETIZERS)\n';
  for (const cat of appData.categories) {
    text += `\n### ${cat.name_th} (${cat.name_en})\n`;
    if (!cat.items) continue;
    for (const item of cat.items) {
      const sizes = (item.subitems || []).map(s =>
        `${s.sizename_th}(${s.sizecode}): ${s.price}฿`
      ).join(' | ');
      const filterType = (item.filter_type || []).join(', ');
      text += `- **${item.name_th}** (${item.name_en}) [code: ${item.code}] — ${sizes}`;
      if (filterType) text += ` [${filterType}]`;
      text += '\n';
    }
  }
  return text;
}

function buildComboContext(comboData) {
  if (!comboData || !comboData.categories) return '';

  let text = '## คอมโบ (COMBO)\n';
  for (const cat of comboData.categories) {
    if (!cat.items) continue;
    for (const item of cat.items) {
      text += `- **${item.name_th}** (${item.name_en}) [code: ${item.code}] — ${item.price}฿\n`;
      text += `  รายละเอียด: ${item.description_th || item.description_en || ''}\n`;
      if (item.itemSelection) {
        for (const sel of item.itemSelection) {
          const choices = (sel.itemGroups || []).map(g => g.name_th || g.name_en).join(', ');
          text += `  ${sel.name_th}: ${choices}\n`;
        }
      }
    }
  }
  return text;
}

function buildPromotionContext(promoData) {
  if (!promoData || !promoData.categories) return '';

  let text = '## โปรโมชัน (PROMOTION)\n';
  for (const cat of promoData.categories) {
    if (!cat.items) continue;
    for (const item of cat.items) {
      text += `- **${item.name_th}** (${item.name_en}) [code: ${item.code}] — ${item.price}฿\n`;
      text += `  รายละเอียด: ${item.description_th || item.description_en || ''}\n`;
    }
  }
  return text;
}

function buildRecommendContext(recData) {
  if (!recData || !recData.categories) return '';

  let text = '## เมนูแนะนำ (RECOMMEND)\n';
  for (const cat of recData.categories) {
    text += `\n### ${cat.name_th || cat.name_en}\n`;
    if (!cat.items) continue;
    for (const item of cat.items) {
      if (item.product_type === 'MEALSET' || item.product_type === 'PROMOTION') {
        text += `- **${item.name_th}** (${item.name_en}) [code: ${item.code}] — ${item.price}฿\n`;
        text += `  ${item.description_th || ''}\n`;
      } else {
        const sizes = (item.subitems || []).map(s =>
          `${s.sizename_th || s.sizecode}: ${s.price}฿`
        ).join(' | ');
        text += `- **${item.name_th}** (${item.name_en}) [code: ${item.code}] — ${sizes}\n`;
      }
    }
  }
  return text;
}

function buildToppingsContext(toppingsData) {
  if (!toppingsData || !toppingsData.AddonToppingsList) return '';

  let text = '## ท็อปปิ้งเพิ่มเติม (ADDON TOPPINGS)\n';
  const list = toppingsData.AddonToppingsList;
  for (const entry of list) {
    for (const [productType, sizes] of Object.entries(entry)) {
      text += `\n### ${productType}\n`;
      for (const [size, data] of Object.entries(sizes)) {
        text += `ขนาด ${size}:\n`;
        if (data.TOPPING) {
          const items = data.TOPPING.map(t => `${t.ingr_name_th}(${t.ingr_code}): ${t.price}฿`).join(', ');
          text += `  ท็อปปิ้ง: ${items}\n`;
        }
        if (data.SAUCE) {
          const items = data.SAUCE.map(s => `${s.ingr_name_th}(${s.ingr_code}): ${s.price}฿`).join(', ');
          text += `  ซอส: ${items}\n`;
        }
      }
    }
  }
  return text;
}

function buildHalfHalfContext(halfData) {
  if (!halfData || !halfData.categories) return '';

  let text = '## พิซซ่าครึ่ง-ครึ่ง (HALF-HALF)\n';
  for (const cat of halfData.categories) {
    if (!cat.items) continue;
    for (const item of cat.items) {
      text += `- **${item.name_th}** (${item.name_en}) [code: ${item.code}] — ${item.price}฿\n`;
      text += `  ${item.description_th || ''}\n`;
    }
  }
  return text;
}

function buildSellingTimeContext(timeData) {
  if (!timeData || !timeData.sellingTimes) return '';

  let text = '## ช่วงเวลาขาย\n';
  for (const st of timeData.sellingTimes) {
    text += `- ${st.name}: ${st.startTime} ถึง ${st.endTime}\n`;
  }
  return text;
}

function buildPriceCalculationContext() {
  return `## วิธีคำนวณราคา
1. เมนูเดี่ยว (Ala Carte):
   - PIZZA: ราคาขนาด + ราคาครัสต์
   - Pasta/Appetizer/Salad/Wings: ราคาขนาดอย่างเดียว
2. โปรโมชัน/คอมโบ:
   - PIZZA: ราคาโปรโมชัน + ราคาขนาด(ส่วนต่าง) + ราคาครัสต์
   - Pasta/Appetizer/Salad/Wings: ราคาโปรโมชัน + ราคาขนาด(ส่วนต่าง)
`;
}

/**
 * สร้าง full context สำหรับส่ง Gemini
 */
function buildFullMenuContext(menuData) {
  const sections = [
    buildPriceCalculationContext(),
    buildPizzaContext(menuData.pizza),
    buildAppetizersContext(menuData.appetizers),
    buildComboContext(menuData.combo),
    buildPromotionContext(menuData.promotion),
    buildRecommendContext(menuData.recommend),
    buildHalfHalfContext(menuData.half),
    buildToppingsContext(menuData.addonToppings),
    buildSellingTimeContext(menuData.sellingTime),
  ];

  return sections.filter(s => s).join('\n\n');
}

module.exports = { buildFullMenuContext };
