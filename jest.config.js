// jest.config.js

export default {
  // 告訴 Jest 在執行測試前，使用 babel-jest 來轉譯 .js 檔案
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  
  // 由於我們使用 ES Modules，需要設定這個來讓 Jest 正確處理 `export default`
  esModuleInterop: true,

  // 測試環境設為 jsdom，讓我們可以使用瀏覽器環境中的物件 (如 window)
  testEnvironment: 'jsdom',

  // 測試檔案的匹配模式
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ]
};