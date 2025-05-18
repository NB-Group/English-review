/**
 * 消息提示模块
 * 处理系统消息的显示和音频播放
 */

import { CAT_PREFIXES } from '../config/constants.js';
import { getCurrentSettings } from '../config/settings.js';
import { playAudioMessage } from './audio.js';

let messageTimeout = null;

/**
 * 显示猫娘风格消息提示
 * @param {string} text - 消息文本
 * @param {string} type - 消息类型 (info, success, error, warning)
 * @param {boolean} autoHide - 是否自动隐藏
 */
export function showMessage(text, type = "info", autoHide = true) {
    const settings = getCurrentSettings();
    
    // 将普通提示转换为猫娘风格
    const randomPrefix = CAT_PREFIXES[Math.floor(Math.random() * CAT_PREFIXES.length)];
    
    // 转换常见提示语为猫娘风格
    let catgirlText = text;
    
    if (text.includes("成功")) {
        catgirlText = text.replace("成功", "成功啦喵～");
    } else if (text.includes("错误")) {
        catgirlText = text.replace("错误", "出错了呜呜～");
    } else if (text.includes("警告")) {
        catgirlText = text.replace("警告", "要小心喵～");
    } else if (text.includes("完成")) {
        catgirlText = text.replace("完成", "完成啦喵～");
    } else if (text.match(/^回答正确/)) {
        catgirlText = "喵呜～答对啦！真是太厉害了～";
    } else if (text.match(/^回答错误/)) {
        catgirlText = "呜喵...答错了呢，不要灰心哦～正确答案是：" + text.split("：")[1];
    } else if (!text.includes("喵")) {
        // 如果没有猫娘特征，添加一个
        catgirlText = `${randomPrefix} ${text}`;
    }
    
    const messageEl = document.getElementById('message');
    if (!messageEl) {
        console.error('Message element not found in DOM');
        return;
    }
    
    // 清除之前的超时
    if (messageTimeout) {
        clearTimeout(messageTimeout);
    }
    
    messageEl.textContent = catgirlText;
    messageEl.style.display = 'block';
    
    // 重置所有类型
    messageEl.className = '';
    messageEl.classList.add(`message-${type}`);
    
    // 播放音频
    playAudioMessage(catgirlText);
    
    // 自动隐藏（错误消息除外或指定不自动隐藏）
    if (autoHide && type !== "error") {
        messageTimeout = setTimeout(() => {
            messageEl.style.display = 'none';
        }, settings.ui.messageDisplayTime || 3000);
    }
    
    return catgirlText; // 返回处理后的文本，方便链式调用
}

/**
 * 隐藏消息
 */
export function hideMessage() {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
    
    if (messageTimeout) {
        clearTimeout(messageTimeout);
        messageTimeout = null;
    }
}

/**
 * 创建并显示确认对话框
 * @param {string} message - 确认消息
 * @param {Function} onConfirm - 确认回调
 * @param {Function} onCancel - 取消回调
 */
export function showConfirm(message, onConfirm, onCancel = null) {
    // 猫娘风格的确认消息
    let catMessage = message;
    if (!message.includes('喵')) {
        const randomPrefix = CAT_PREFIXES[Math.floor(Math.random() * CAT_PREFIXES.length)];
        catMessage = `${randomPrefix} ${message}`;
    }
    
    // 使用原生确认对话框
    if (confirm(catMessage)) {
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    } else {
        if (typeof onCancel === 'function') {
            onCancel();
        }
    }
}
