/**
 * 主入口模块
 * 导入并初始化应用
 */

import { initApp } from './app.js';

// 在页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);

// 导出全局需要的功能，使其在浏览器环境中可访问
window.EnglishReview = {
    // 在需要时可以添加需要暴露给全局的方法
};

// 设置错误处理
window.addEventListener('error', function(event) {
    console.error('捕获到全局错误:', event.error);
    // 可添加错误上报或友好提示
});

// 导出版本信息
console.log('英语复习助手 v1.0.0 已加载');
