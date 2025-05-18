/**
 * UI交互模块
 * 处理用户界面交互和更新
 */

import { DOM_IDS } from '../config/constants.js';
import { getCurrentSettings, saveSettings } from '../config/settings.js';
import { debounce } from '../utils/helpers.js';

// 缓存DOM元素引用
const domElements = {};

/**
 * 初始化UI模块
 */
export function initUI() {
    // 缓存常用DOM元素
    cacheElements();
    
    // 设置响应式主题
    initTheme();
    
    // 设置自动聚焦输入框
    setupAutoFocus();
    
    // 初始化事件监听
    setupEventListeners();
    
    return {
        updateProgress,
        updateQuestion,
        clearInput,
        enableInput,
        disableInput,
        focusInput
    };
}

/**
 * 缓存DOM元素引用
 */
function cacheElements() {
    // 获取常用DOM元素并缓存
    Object.keys(DOM_IDS).forEach(key => {
        const id = DOM_IDS[key];
        const element = document.getElementById(id);
        if (element) {
            domElements[id] = element;
        }
    });
}

/**
 * 获取DOM元素
 * @param {string} id - 元素ID
 * @returns {HTMLElement|null} 元素或null
 */
function getElement(id) {
    // 如果元素已缓存，则返回缓存的元素
    if (domElements[id]) {
        return domElements[id];
    }
    
    // 否则从DOM获取元素
    const element = document.getElementById(id);
    if (element) {
        domElements[id] = element;  // 缓存以备将来使用
    }
    return element;
}

/**
 * 初始化主题
 */
function initTheme() {
    const settings = getCurrentSettings();
    const isDarkMode = settings.ui.darkMode;
    
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

/**
 * 切换主题
 * @returns {boolean} 新的暗色模式状态
 */
export function toggleTheme() {
    const settings = getCurrentSettings();
    settings.ui.darkMode = !settings.ui.darkMode;
    
    if (settings.ui.darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    saveSettings(settings);
    return settings.ui.darkMode;
}

/**
 * 设置自动聚焦功能
 */
function setupAutoFocus() {
    const settings = getCurrentSettings();
    if (settings.quiz.autoFocus) {
        const answerInput = getElement(DOM_IDS.ANSWER_INPUT);
        if (answerInput) {
            answerInput.focus();
        }
    }
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 主题切换按钮
    const themeToggle = getElement(DOM_IDS.THEME_TOGGLE);
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // 响应式调整：窗口大小变化时调整UI
    window.addEventListener('resize', debounce(handleWindowResize, 250));
    
    // 初始调整
    handleWindowResize();
}

/**
 * 处理窗口大小变化
 */
function handleWindowResize() {
    const container = getElement(DOM_IDS.CONTAINER);
    if (!container) return;
    
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        container.classList.add('mobile-view');
    } else {
        container.classList.remove('mobile-view');
    }
}

/**
 * 更新进度条
 * @param {number} current - 当前进度
 * @param {number} total - 总数
 */
export function updateProgress(current, total) {
    const progressBar = getElement(DOM_IDS.PROGRESS_BAR);
    const progressText = getElement(DOM_IDS.PROGRESS_TEXT);
    
    if (!progressBar || !progressText) return;
    
    const percentage = total > 0 ? (current / total) * 100 : 0;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${current}/${total}`;
}

/**
 * 更新问题显示
 * @param {string} text - 问题文本
 */
export function updateQuestion(text) {
    const chineseText = getElement(DOM_IDS.CHINESE_TEXT);
    if (chineseText) {
        chineseText.textContent = text;
    }
}

/**
 * 清空输入框
 */
export function clearInput() {
    const answerInput = getElement(DOM_IDS.ANSWER_INPUT);
    if (answerInput) {
        answerInput.value = '';
    }
}

/**
 * 启用输入和提交按钮
 */
export function enableInput() {
    const answerInput = getElement(DOM_IDS.ANSWER_INPUT);
    const submitButton = getElement(DOM_IDS.SUBMIT_BUTTON);
    
    if (answerInput) {
        answerInput.disabled = false;
    }
    
    if (submitButton) {
        submitButton.disabled = false;
    }
    
    // 自动聚焦
    const settings = getCurrentSettings();
    if (settings.quiz.autoFocus && answerInput) {
        answerInput.focus();
    }
}

/**
 * 禁用输入和提交按钮
 */
export function disableInput() {
    const answerInput = getElement(DOM_IDS.ANSWER_INPUT);
    const submitButton = getElement(DOM_IDS.SUBMIT_BUTTON);
    
    if (answerInput) {
        answerInput.disabled = true;
    }
    
    if (submitButton) {
        submitButton.disabled = true;
    }
}

/**
 * 聚焦输入框
 */
export function focusInput() {
    const answerInput = getElement(DOM_IDS.ANSWER_INPUT);
    if (answerInput) {
        answerInput.focus();
    }
}

/**
 * 获取用户输入
 * @returns {string} 用户输入
 */
export function getUserInput() {
    const answerInput = getElement(DOM_IDS.ANSWER_INPUT);
    return answerInput ? answerInput.value.trim() : '';
}

/**
 * 显示完成状态
 * @param {boolean} isRetryMode - 是否处于重试模式
 * @param {number} wrongCount - 错题数量
 */
export function showCompletion(isRetryMode, wrongCount = 0) {
    updateQuestion(isRetryMode ? 
        "喵～错题练习完成啦！" : 
        "喵喵～所有题目都完成啦！");
    
    disableInput();
}

/**
 * 清理UI资源
 */
export function cleanupUI() {
    // 移除事件监听器
    const themeToggle = getElement(DOM_IDS.THEME_TOGGLE);
    if (themeToggle) {
        themeToggle.removeEventListener('click', toggleTheme);
    }
    
    window.removeEventListener('resize', handleWindowResize);
}
