const express = require('express');
const router = express.Router();

/**
 * สร้าง menu routes จากข้อมูลที่โหลดแล้ว
 * @param {Object} menuData - ข้อมูลเมนูที่โหลดจากไฟล์ JSON
 */
function createMenuRoutes(menuData) {
  const { pizza, appetizers, combo, half, promotion, recommend, addonToppings, sellingTime } = menuData;

  // Helper: สร้าง response สำเร็จ
  function successResponse(data) {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  // Helper: สร้าง response ผิดพลาด
  function errorResponse(message, statusCode = 404) {
    return {
      statusCode,
      body: {
        success: false,
        error: message,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Map group name -> ข้อมูล
  const groupMap = {
    pizza: pizza,
    appetizers: appetizers,
    combo: combo,
    half: half,
    promotion: promotion,
    recommend: recommend
  };

  // =====================================================
  // GET /api/menu — รายการ group ทั้งหมด
  // =====================================================
  router.get('/menu', (req, res) => {
    const groups = Object.keys(groupMap).map(key => ({
      group: key.toUpperCase(),
      name_en: groupMap[key].group || key,
      categories_count: groupMap[key].categories ? groupMap[key].categories.length : 0
    }));

    res.json(successResponse(groups));
  });

  // =====================================================
  // GET /api/menu/:group — ข้อมูลทั้งหมดของ group
  // =====================================================
  router.get('/menu/:group', (req, res) => {
    const groupName = req.params.group.toLowerCase();
    const groupData = groupMap[groupName];

    if (!groupData) {
      const err = errorResponse(`Group '${req.params.group}' not found. Available groups: ${Object.keys(groupMap).join(', ')}`);
      return res.status(err.statusCode).json(err.body);
    }

    res.json(successResponse(groupData));
  });

  // =====================================================
  // GET /api/menu/:group/:itemCode — ข้อมูลสินค้าตัวเดียว
  // =====================================================
  router.get('/menu/:group/:itemCode', (req, res) => {
    const groupName = req.params.group.toLowerCase();
    const itemCode = req.params.itemCode.toUpperCase();
    const groupData = groupMap[groupName];

    if (!groupData) {
      const err = errorResponse(`Group '${req.params.group}' not found.`);
      return res.status(err.statusCode).json(err.body);
    }

    // ค้นหา item จาก code ในทุก category
    let foundItem = null;
    if (groupData.categories) {
      for (const category of groupData.categories) {
        // สำหรับ group ที่มี items (PIZZA, APPETIZERS)
        if (category.items) {
          foundItem = category.items.find(item => item.code === itemCode);
          if (foundItem) break;
        }
        // สำหรับ group ที่มี itemSelection (COMBO, PROMOTION)
        if (category.items) {
          for (const item of category.items) {
            if (item.code === itemCode) {
              foundItem = item;
              break;
            }
          }
          if (foundItem) break;
        }
      }
    }

    if (!foundItem) {
      const err = errorResponse(`Item with code '${itemCode}' not found in group '${groupName}'.`);
      return res.status(err.statusCode).json(err.body);
    }

    res.json(successResponse(foundItem));
  });

  // =====================================================
  // GET /api/promotions — โปรโมชันทั้งหมด
  // =====================================================
  router.get('/promotions', (req, res) => {
    res.json(successResponse(promotion));
  });

  // =====================================================
  // GET /api/combos — คอมโบทั้งหมด
  // =====================================================
  router.get('/combos', (req, res) => {
    res.json(successResponse(combo));
  });

  // =====================================================
  // GET /api/recommend — เมนูแนะนำ
  // =====================================================
  router.get('/recommend', (req, res) => {
    res.json(successResponse(recommend));
  });

  // =====================================================
  // GET /api/toppings — ท็อปปิ้งเพิ่มเติม
  // Query: ?size=M (optional, filter by size)
  // =====================================================
  router.get('/toppings', (req, res) => {
    const sizeFilter = req.query.size ? req.query.size.toUpperCase() : null;

    if (sizeFilter) {
      // กรอง toppings ตามขนาด
      const filtered = {};
      const toppingsList = addonToppings.AddonToppingsList || [];

      for (const entry of toppingsList) {
        for (const [productType, sizes] of Object.entries(entry)) {
          if (sizes[sizeFilter]) {
            if (!filtered[productType]) {
              filtered[productType] = {};
            }
            filtered[productType][sizeFilter] = sizes[sizeFilter];
          }
        }
      }

      if (Object.keys(filtered).length === 0) {
        const err = errorResponse(`No toppings found for size '${sizeFilter}'. Available sizes depend on product type (e.g., S, M, L, NPL10).`);
        return res.status(err.statusCode).json(err.body);
      }

      res.json(successResponse(filtered));
    } else {
      res.json(successResponse(addonToppings));
    }
  });

  // =====================================================
  // GET /api/half-half — เมนูพิซซ่าครึ่ง-ครึ่ง
  // =====================================================
  router.get('/half-half', (req, res) => {
    res.json(successResponse(half));
  });

  // =====================================================
  // GET /api/selling-time — ช่วงเวลาให้บริการ
  // =====================================================
  router.get('/selling-time', (req, res) => {
    res.json(successResponse(sellingTime));
  });

  return router;
}

module.exports = createMenuRoutes;
