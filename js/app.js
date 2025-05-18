/**
 * 应用初始化和组织
 * 集成各个功能模块并处理应用逻辑
 */

import { initBackgroundModule, setBackgroundByOrientation } from './modules/background.js';
import { initAudio, toggleAudio, getAudioState, playAudioMessage } from './modules/audio.js';
import { showMessage } from './modules/message.js';
import { initPomodoro } from './modules/pomodoro.js';
import { initUI, updateProgress, updateQuestion, clearInput, enableInput, disableInput, getUserInput, showCompletion } from './modules/ui.js';
import { initFileSelector, initImportFileInput, triggerImportFileDialog } from './modules/file-handler.js';
import { initData, loadDocument, getCurrentQuestion, moveToNextQuestion, getProgress, setRetryMode, getCurrentFileName } from './modules/data.js';
import { initErrorManager, addWrongAnswer, getWrongAnswers, clearWrongAnswers, exportWrongAnswers, importWrongAnswers } from './modules/error-manager.js';
import { DOM_IDS, ANSWER_SETTINGS } from './config/constants.js';
import { getCurrentSettings } from './config/settings.js';
import { filterAnswer, checkConnectedPhrases, checkSlashOptions, highlightIncorrectParts } from './utils/helpers.js';

// 应用状态
const appState = {
    initialized: false
};

/**
 * 初始化应用
 */
export function initApp() {
    if (appState.initialized) {
        console.warn('App already initialized');
        return;
    }
    
    // 初始化背景
    initBackgroundModule();
    
    // 初始化音频
    const audioState = initAudio();
    
    // 初始化UI
    initUI();
    
    // 初始化番茄时钟
    initPomodoro();
    
    // 初始化数据模块
    initData();
    
    // 初始化错题管理器
    initErrorManager();
    
    // 初始化文件选择器
    initFileSelector((documentName) => {
        loadDocument(documentName);
        displayCurrentQuestion();
    });
    
    // 初始化导入功能
    initImportFileInput((file) => {
        return importWrongAnswers(file);
    });
    
    // 设置事件监听器
    setupEventListeners();
    
    // 标记初始化完成
    appState.initialized = true;
    
    console.log('应用初始化完成');
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 提交按钮
    const submitButton = document.getElementById(DOM_IDS.SUBMIT_BUTTON);
    if (submitButton) {
        submitButton.addEventListener('click', handleSubmit);
    }
    
    // 重做错题按钮
    const retryButton = document.getElementById(DOM_IDS.RETRY_BUTTON);
    if (retryButton) {
        retryButton.addEventListener('click', handleRetry);
    }
    
    // 导出错题按钮
    const exportButton = document.getElementById(DOM_IDS.EXPORT_BUTTON);
    if (exportButton) {
        exportButton.addEventListener('click', handleExport);
    }
    
    // 导入错题按钮
    const importButton = document.getElementById(DOM_IDS.IMPORT_BUTTON);
    if (importButton) {
        importButton.addEventListener('click', handleImport);
    }
    
    // 音频切换按钮
    const audioToggleBtn = document.getElementById(DOM_IDS.AUDIO_TOGGLE);
    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', handleAudioToggle);
        // 更新初始状态
        updateAudioButtonState(audioToggleBtn, getAudioState().enabled);
    }
    
    // 输入框回车键提交
    const answerInput = document.getElementById(DOM_IDS.ANSWER_INPUT);
    if (answerInput) {
        answerInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault();
                handleSubmit();
            }
        });
    }
}

/**
 * 更新音频按钮状态
 * @param {HTMLElement} button - 按钮元素
 * @param {boolean} isEnabled - 音频是否启用
 */
function updateAudioButtonState(button, isEnabled) {
    if (!button) return;
    
    button.textContent = isEnabled ? '🔊' : '🔇';
    button.title = isEnabled ? '关闭语音提示' : '开启语音提示';
    
    if (isEnabled) {
        button.classList.add('audio-enabled');
    } else {
        button.classList.remove('audio-enabled');
    }
}

/**
 * 处理提交答案
 */
function handleSubmit() {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;
    
    const userAnswer = getUserInput();
    if (!userAnswer) {
        showMessage("请输入答案再提交哦", "warning");
        return;
    }
    
    const correctAnswers = Array.isArray(currentQuestion.english) 
        ? currentQuestion.english 
        : [currentQuestion.english];
    
    // 使用答案评分设置中的忽略词列表
    const ignoreWords = ANSWER_SETTINGS.IGNORE_WORDS;
    
    // 检查任意一个正确答案是否匹配
    const isCorrect = correctAnswers.some(correctAnswer => 
        filterAnswer(userAnswer, ignoreWords) === filterAnswer(correctAnswer, ignoreWords)
    );
    
    // 检查特殊匹配情况
    const hasSlashMatch = checkSlashOptions(userAnswer, correctAnswers, ignoreWords);
    const hasConnectedMatch = correctAnswers.some(correctAnswer => 
        checkConnectedPhrases(userAnswer, correctAnswer, ignoreWords)
    );
    
    if (isCorrect || hasSlashMatch || hasConnectedMatch) {
        // 答案正确
        showMessage("喵呜～答对啦！真是太聪明了～", "success");
        playAudioMessage(null, "答对了喵~.mp3");
    } else {
        // 答案错误
        const correctAnswer = correctAnswers[0]; // 使用第一个正确答案作为参考
        
        // 生成高亮标记的答案
        const highlightedAnswer = highlightIncorrectParts(correctAnswer, userAnswer, ignoreWords);
        
        // 构建错题对象
        const wrongAnswerItem = {
            english: correctAnswer,
            chinese: currentQuestion.chinese,
            userAnswer: userAnswer,
            highlightedAnswer: highlightedAnswer
        };
        
        // 添加到错题列表
        addWrongAnswer(wrongAnswerItem);
        
        // 显示错误消息
        showMessage(`呜呜～答错了呢...正确答案是：${correctAnswers.join(' 或 ')}`, "error");
        playAudioMessage(null, "喵喵～ 呜呜～答错了呢...正确答案是这个.mp3");
    }
    
    // 移动到下一题
    moveToNextQuestion();
    
    // 更新进度和显示
    const progress = getProgress();
    updateProgress(progress.current, progress.total);
    
    // 显示下一题或完成信息
    displayCurrentQuestion();
}

/**
 * 显示当前问题
 */
function displayCurrentQuestion() {
    const currentQuestion = getCurrentQuestion();
    const progress = getProgress();
    
    updateProgress(progress.current, progress.total);
    
    if (currentQuestion) {
        updateQuestion(currentQuestion.chinese);
        clearInput();
        enableInput();
    } else {
        // 所有题目已完成
        showCompletionMessage();
        disableInput();
    }
}

/**
 * 显示完成信息
 */
function showCompletionMessage() {
    const progress = getProgress();
    const wrongAnswers = getWrongAnswers();
    
    showCompletion(false, wrongAnswers.length);
    
    const correctCount = progress.total - wrongAnswers.length;
    const percentage = progress.total > 0 ? Math.round((correctCount / progress.total) * 100) : 100;
    
    showMessage(`完成了所有题目！正确率: ${percentage}%，${percentage >= 80 ? '真是太厉害了！' : '继续加油哦～'}`, "info");
    playAudioMessage(null, "喵～已完成所有题目喵～.mp3");
}

/**
 * 处理重做错题
 */
function handleRetry() {
    const wrongAnswers = getWrongAnswers();
    if (setRetryMode(wrongAnswers)) {
        // 清空错题列表
        clearWrongAnswers();
        
        // 显示第一题
        displayCurrentQuestion();
    }
}

/**
 * 处理导出错题
 */
function handleExport() {
    exportWrongAnswers()
        .catch(error => console.error('导出错题失败:', error));
}

/**
 * 处理导入错题
 */
function handleImport() {
    triggerImportFileDialog();
}

/**
 * 处理音频切换
 */
function handleAudioToggle() {
    const isEnabled = toggleAudio();
    const audioToggleBtn = document.getElementById(DOM_IDS.AUDIO_TOGGLE);
    
    updateAudioButtonState(audioToggleBtn, isEnabled);
    showMessage(`语音提示已${isEnabled ? '开启' : '关闭'}`, "info");
}

// 在页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);

// 处理页面关闭前的清理工作
window.addEventListener('beforeunload', function() {
    // 这里可以添加保存状态等逻辑
});
