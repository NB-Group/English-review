/**
 * 音频处理模块
 * 处理所有音频播放和管理
 */

import { AUDIO_MAPPINGS } from '../config/constants.js';
import { getCurrentSettings } from '../config/settings.js';
import { getFromStorage, saveToStorage } from '../utils/storage.js';

// 音频缓存
const audioCache = {};

// 音频播放状态
let isAudioEnabled = false;

/**
 * 初始化音频模块
 */
export function initAudio() {
    // 从存储中加载音频设置
    isAudioEnabled = getFromStorage('english_review_audio_enabled', false);
    return { isAudioEnabled };
}

/**
 * 切换音频启用状态
 */
export function toggleAudio() {
    isAudioEnabled = !isAudioEnabled;
    saveToStorage('english_review_audio_enabled', isAudioEnabled);
    return isAudioEnabled;
}

/**
 * 设置音频启用状态
 * @param {boolean} state - 新的音频状态
 */
export function setAudioEnabled(state) {
    isAudioEnabled = Boolean(state);
    saveToStorage('english_review_audio_enabled', isAudioEnabled);
    return isAudioEnabled;
}

/**
 * 获取当前音频状态
 */
export function getAudioState() {
    return {
        enabled: isAudioEnabled
    };
}

/**
 * 播放音频消息
 * @param {string} text - 消息文本，用于匹配音频文件
 * @param {string} specificAudioFile - 可选，指定特定的音频文件名
 */
export function playAudioMessage(text, specificAudioFile = null) {
    if (!isAudioEnabled) return;
    
    const settings = getCurrentSettings();
    const audioPath = settings.audio.audioPath || 'Audio/';
    
    // 如果提供了特定的音频文件名，则直接使用
    let audioFilename = specificAudioFile;
    
    // 如果没有提供特定的音频文件名，则尝试通过关键词匹配
    if (!audioFilename && text) {
        // 尝试查找匹配的音频文件
        for (const mapping of AUDIO_MAPPINGS) {
            if (mapping.keywords.some(keyword => text.includes(keyword))) {
                audioFilename = mapping.filename;
                break;
            }
        }
    }
    
    // 如果没找到匹配的文件，则退出
    if (!audioFilename) {
        console.log(`没有找到匹配的音频文件: "${text}"`);
        return;
    }
    
    const fullAudioPath = `${audioPath}${audioFilename}`;
    
    // 尝试从缓存加载
    if (audioCache[fullAudioPath]) {
        audioCache[fullAudioPath].currentTime = 0; // 重置播放位置
        audioCache[fullAudioPath].play().catch(e => console.error("播放缓存音频失败:", e));
        return;
    }
    
    // 创建新的 Audio 对象
    const audio = new Audio(fullAudioPath);
    
    // 设置音量
    audio.volume = settings.audio.volume || 1.0;
    
    // 预加载并播放
    audio.preload = 'auto';
    audio.play().then(() => {
        // 播放成功，加入缓存
        audioCache[fullAudioPath] = audio;
    }).catch(error => {
        console.warn(`无法加载或播放音频: ${fullAudioPath}`, error);
    });
    
    // 错误处理
    audio.onerror = (e) => {
        console.error(`加载音频文件出错: ${fullAudioPath}`, e);
    };
}

/**
 * 播放通知声音（无需猫娘音频）
 */
export function playNotificationSound() {
    if (!isAudioEnabled) return;
    
    // 使用 base64 编码的标准提示音
    const audio = new Audio("data:audio/wav;base64,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Zgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
    audio.play().catch(e => console.error("播放通知声音失败:", e));
}

/**
 * 预加载一组音频文件
 * @param {string[]} filenames - 要预加载的文件名数组
 */
export function preloadAudio(filenames) {
    if (!isAudioEnabled) return;
    
    const settings = getCurrentSettings();
    const audioPath = settings.audio.audioPath || 'Audio/';
    
    filenames.forEach(filename => {
        const fullPath = `${audioPath}${filename}`;
        if (!audioCache[fullPath]) {
            const audio = new Audio(fullPath);
            audio.preload = 'auto';
            audio.load();
            
            // 添加到缓存
            audio.addEventListener('canplaythrough', () => {
                audioCache[fullPath] = audio;
                console.log(`预加载音频: ${filename}`);
            }, { once: true });
            
            audio.onerror = () => {
                console.warn(`无法预加载音频: ${filename}`);
            };
        }
    });
}

/**
 * 清理音频缓存
 */
export function clearAudioCache() {
    for (const key in audioCache) {
        audioCache[key].pause();
        audioCache[key].src = '';
    }
    Object.keys(audioCache).forEach(key => delete audioCache[key]);
    console.log('已清理音频缓存');
}
