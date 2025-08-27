/**
 * @file Quote_Data_Structure_Final.js
 * @description 最終版的估價單數據結構，完整涵蓋兩階段估價流程與所有商業規則。
 * This is the definitive blueprint for the StateManager's state.
 */
const quoteStateBlueprint = {

  // --- 報價單元數據 (在流程中逐漸填寫) ---
  quoteId: "2025081517",
  issueDate: "2025-08-24", // 使用 ISO 8601 格式
  dueDate: "2025-09-08",   // 使用 ISO 8601 格式
  status: "Configuring", // e.g., Configuring, Ready, Sent
  
  // --- 客戶資訊 (流程開始前已建立) ---
  customer: { 
    name: "",
    address: "",
    phone: "",
    email: ""
  },

  // --- 核心項目列表 ---
  // 在第一階段，這個列表只會被填入 W, H, TYPE, Price 等少量核心數據
  // 在第二階段，這個列表會被填入 motor, controlSide 等所有詳細規格
  rollerBlindItems: [
    // --- 範例數據 ---
    {
      itemId: "uuid-1", // 程式自動生成的唯一ID
      // --- Stage 1 核心數據 ---
      width: 0,
      height: 0,
      fabricType: null, // 'BO', 'BO1', 'SN'
      
      // --- Stage 2 詳細數據 ---
      fabricName: "", // 在第二階段手動輸入
      fabricColor: "", // 在第二階段手動輸入
      location: "", // 在第二階段手動輸入
      mountType: "IN", // 'IN' or 'OUT'
      isRollOver: false,
      controlSide: "RIGHT", // 'LEFT' or 'RIGHT'
      chainLength: null, // or a number
      hasHeavyDutyWinder: false,
      hasDoubleBracket: false,
      motorType: "NONE", // 'NONE', 'BATTERY', 'WIRED'
      
      // --- 計算結果 ---
      linePrice: 0 
    }
  ],
  
  // --- 僅在第二階段處理的數據 ---
  rollerBlindsDiscountPercentage: 0,
  
  accessories: {
      remotes: { quantity: 0, unitPrice: 100 },
      chargers: { quantity: 0, unitPrice: 50 }
  },

  additionalServices: [
    { 
      serviceId: 'removal',
      description: 'Removal of old curtains', 
      amount: 150.00, // 預設值，可修改
      isWaived: false // 豁免狀態
    },
    { 
      serviceId: 'travel',
      description: 'Travel Surcharge', 
      amount: 50.00, // 預設值，可修改
      isWaived: false // 豁免狀態
    }
    // ... 其他手動新增的服務 ...
  ],

  // --- 固定費用 (第二階段處理) ---
  delivery: { amount: 150.00, isWaived: false },
  installation: { amount: 0, isWaived: false },
  
  // --- 最終計算總結 (第二階段處理) ---
  summary: { 
    // ... 包含所有層次的計算結果 ...
  }
};
