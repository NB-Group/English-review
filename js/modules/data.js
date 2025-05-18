/**
 * 数据处理模块
 * 负责加载和处理问答数据
 */

import { shuffleArray } from '../utils/helpers.js';
import { showMessage } from './message.js';
import { playAudioMessage } from './audio.js';
// 导入 docxData
import { docxData } from '../data/docx-data.js';

// 当前问答数据状态
let currentIndex = 0;
let qaPairs = [];
let currentFileName = "";
let isRetryMode = false;

/**
 * 初始化数据模块
 * @returns {Object} 当前数据状态
 */
export function initData() {
    // 返回初始状态
    return {
        currentIndex,
        qaPairs,
        currentFileName,
        isRetryMode
    };
}

/**
 * 加载指定文档数据
 * @param {string} documentName - 要加载的文档名称
 * @param {boolean} shuffle - 是否打乱问题顺序
 * @returns {boolean} 是否成功加载数据
 */
export function loadDocument(documentName, shuffle = true) {
    // 确保文档数据已加载 (现在从导入的模块获取)
    if (typeof docxData === 'undefined' || !docxData[documentName]) {
        showMessage("找不到指定文档喵～请确保文档数据已正确加载并且存在于 docx-data.js", "error");
        return false;
    }
    
    currentFileName = documentName;
    qaPairs = [...docxData[documentName]]; // 使用导入的 docxData
    
    // 随机排序题目
    if (shuffle) {
        shuffleArray(qaPairs);
    }
    
    currentIndex = 0;
    isRetryMode = false;
    
    showMessage(`已加载"${documentName}"，共${qaPairs.length}道题目等着你来解答喵！`, "success");
    playAudioMessage(null, "喵～已加载所选文档，这些题目等着你来解答喵！.mp3");
    
    return true;
}

/**
 * 获取当前问题
 * @returns {Object|null} 当前问题对象或null（如果没有更多问题）
 */
export function getCurrentQuestion() {
    if (currentIndex >= qaPairs.length) {
        return null;
    }
    return qaPairs[currentIndex];
}

/**
 * 移动到下一题
 * @returns {Object|null} 下一题对象或null（如果没有更多问题）
 */
export function moveToNextQuestion() {
    currentIndex++;
    return getCurrentQuestion();
}

/**
 * 重置为指定问题索引
 * @param {number} index - 目标索引
 */
export function setCurrentIndex(index) {
    if (index >= 0 && index <= qaPairs.length) {
        currentIndex = index;
    }
}

/**
 * 获取当前进度信息
 * @returns {Object} 进度信息对象 { current, total, percentage }
 */
export function getProgress() {
    const total = qaPairs.length;
    const percentage = total > 0 ? (currentIndex / total) * 100 : 0;
    
    return {
        current: currentIndex,
        total: total,
        percentage: percentage
    };
}

/**
 * 设置错题模式
 * @param {Array} wrongAnswersList - 错题列表
 * @returns {boolean} 是否成功设置错题模式
 */
export function setRetryMode(wrongAnswersList) {
    if (!Array.isArray(wrongAnswersList) || wrongAnswersList.length === 0) {
        showMessage("没有错题需要重做呢，太厉害啦！", "warning");
        playAudioMessage(null, "喵～没有错题需要重做呢，太厉害啦！.mp3");
        return false;
    }
    
    isRetryMode = true;
    currentIndex = 0;
    qaPairs = [...wrongAnswersList];
    
    showMessage("开始练习错题啦！加油哦～", "info");
    playAudioMessage(null, "喵～开始练习错题啦！加油哦～.mp3");
    
    return true;
}

/**
 * 获取当前文件名
 * @returns {string} 当前文件名
 */
export function getCurrentFileName() {
    return currentFileName;
}

/**
 * 检查是否处于错题重做模式
 * @returns {boolean} 是否处于错题重做模式
 */
export function isInRetryMode() {
    return isRetryMode;
}

/**
 * 获取当前的数据状态
 * @returns {Object} 数据状态对象
 */
export function getDataState() {
    return {
        currentIndex,
        qaPairs: qaPairs.length, // 只返回长度，避免数据过大
        fileName: currentFileName,
        isRetryMode
    };
}

/**
 * 重置数据状态
 */
export function resetData() {
    currentIndex = 0;
    qaPairs = [];
    currentFileName = "";
    isRetryMode = false;
}
