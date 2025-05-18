/**
 * 背景图片处理模块
 * 管理应用的背景图片和相关效果
 */

import { BACKGROUND_IMAGES } from '../config/constants.js';

/**
 * 设置背景图片
 * @param {string} url - 背景图片URL
 */
export function setBackground(url) {
    if (!url) return;
    
    document.body.style.backgroundImage = `url(${url})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
}

/**
 * 根据屏幕方向设置背景图片
 */
export function setBackgroundByOrientation() {
    const isLandscape = window.innerWidth > window.innerHeight;
    const url = isLandscape ? BACKGROUND_IMAGES.LANDSCAPE : BACKGROUND_IMAGES.PORTRAIT;
    setBackground(url);
}

/**
 * 使用必应每日图片作为背景
 */
export function setBingDailyBackground() {
    setBackground('https://api.paugram.com/bing/');
}

/**
 * 使用随机动漫图片作为背景
 */
export function setRandomAnimeBackground() {
    // 使用一些可用的随机动漫图片API
    const apis = [
        'https://api.ixiaowai.cn/api/api.php',
        'https://api.dongmanxingkong.com/suijitupian/acg/1080/1920', 
        'https://api.lolicon.app/setu/v2?size=regular&r18=0'
    ];
    
    const randomApi = apis[Math.floor(Math.random() * apis.length)];
    setBackground(randomApi);
}

/**
 * 应用自定义背景图片
 * @param {string} url - 自定义背景URL
 */
export function setCustomBackground(url) {
    if (!url) {
        console.error('No background URL provided');
        return;
    }
    
    setBackground(url);
}

/**
 * 应用背景模糊效果
 * @param {number} blurAmount - 模糊量（像素）
 */
export function setBackgroundBlur(blurAmount = 5) {
    document.body.style.backdropFilter = `blur(${blurAmount}px)`;
    document.body.style.webkitBackdropFilter = `blur(${blurAmount}px)`;
}

/**
 * 初始化背景模块
 */
export function initBackgroundModule() {
    // 设置初始背景
    setBackgroundByOrientation();
    
    // 添加屏幕旋转监听
    window.addEventListener('resize', setBackgroundByOrientation);
    
    // 显示初始化成功
    console.log('Background module initialized');
}

/**
 * 清理背景模块（移除事件监听器等）
 */
export function cleanupBackgroundModule() {
    window.removeEventListener('resize', setBackgroundByOrientation);
}
