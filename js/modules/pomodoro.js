/**
 * 番茄时钟模块
 * 管理番茄工作法计时器
 */

import { STORAGE_KEYS, DOM_IDS } from '../config/constants.js';
import { getCurrentSettings } from '../config/settings.js';
import { formatTime } from '../utils/helpers.js';
import { getFromStorage, saveToStorage } from '../utils/storage.js';
import { showMessage } from './message.js';
import { playAudioMessage, playNotificationSound } from './audio.js';

// 番茄时钟状态
const pomodoroState = {
    isActive: false,
    isPaused: false,
    isBreak: false,
    studyMinutes: 25,
    breakMinutes: 5,
    remainingSeconds: 0,
    timerId: null,
    lastUpdate: Date.now()
};

// DOM 元素引用
let timerContainer;
let timerCountdown;
let timerStatus;
let pauseTimerBtn;
let pomodoroModal;

/**
 * 初始化番茄时钟
 */
export function initPomodoro() {
    // 获取DOM元素
    timerContainer = document.getElementById(DOM_IDS.TIMER_CONTAINER);
    timerCountdown = document.getElementById(DOM_IDS.TIMER_COUNTDOWN);
    timerStatus = document.getElementById(DOM_IDS.TIMER_STATUS);
    pauseTimerBtn = document.getElementById(DOM_IDS.PAUSE_TIMER);
    pomodoroModal = document.getElementById(DOM_IDS.POMODORO_MODAL);
    
    // 恢复保存的配置
    restorePomodoroConfig();
    
    // 恢复保存的状态
    restorePomodoroState();
    
    // 设置事件监听
    setupEventListeners();
    
    return pomodoroState;
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 打开模态窗口
    const pomodoroBtn = document.getElementById(DOM_IDS.POMODORO_BUTTON);
    if (pomodoroBtn) {
        pomodoroBtn.addEventListener("click", openPomodoroModal);
    }
    
    // 关闭模态窗口
    const closeModal = document.querySelector(".close-modal");
    if (closeModal) {
        closeModal.addEventListener("click", closePomodoroModal);
    }
    
    // 点击模态窗口外部关闭
    window.addEventListener("click", function(event) {
        if (event.target === pomodoroModal) {
            closePomodoroModal();
        }
    });
    
    // 开始番茄钟
    const startPomodoroBtn = document.getElementById(DOM_IDS.START_POMODORO);
    if (startPomodoroBtn) {
        startPomodoroBtn.addEventListener("click", startPomodoro);
    }
    
    // 暂停/恢复计时器
    if (pauseTimerBtn) {
        pauseTimerBtn.addEventListener("click", togglePauseTimer);
    }
    
    // 停止计时器
    const stopTimerBtn = document.getElementById(DOM_IDS.STOP_TIMER);
    if (stopTimerBtn) {
        stopTimerBtn.addEventListener("click", stopTimer);
    }
}

/**
 * 打开番茄钟设置窗口
 */
function openPomodoroModal() {
    if (pomodoroModal) {
        pomodoroModal.style.display = "block";
        
        // 设置当前值
        const studyTimeInput = document.getElementById(DOM_IDS.STUDY_TIME);
        const breakTimeInput = document.getElementById(DOM_IDS.BREAK_TIME);
        
        if (studyTimeInput) {
            studyTimeInput.value = pomodoroState.studyMinutes;
        }
        
        if (breakTimeInput) {
            breakTimeInput.value = pomodoroState.breakMinutes;
        }
    }
}

/**
 * 关闭番茄钟设置窗口
 */
function closePomodoroModal() {
    if (pomodoroModal) {
        pomodoroModal.style.display = "none";
    }
}

/**
 * 开始番茄时钟
 */
function startPomodoro() {
    const studyTimeInput = document.getElementById(DOM_IDS.STUDY_TIME);
    const breakTimeInput = document.getElementById(DOM_IDS.BREAK_TIME);
    
    const studyTime = parseInt(studyTimeInput?.value) || 25;
    const breakTime = parseInt(breakTimeInput?.value) || 5;
    
    pomodoroState.studyMinutes = studyTime;
    pomodoroState.breakMinutes = breakTime;
    pomodoroState.isActive = true;
    pomodoroState.isPaused = false;
    pomodoroState.isBreak = false;
    pomodoroState.remainingSeconds = studyTime * 60;
    pomodoroState.lastUpdate = Date.now();
    
    // 保存配置
    savePomodoroConfig();
    savePomodoroState();
    
    updateTimerDisplay();
    startTimer();
    
    closePomodoroModal();
    
    if (timerContainer) {
        timerContainer.style.display = "flex";
    }
    
    showMessage(`番茄时钟开始啦！先学习 ${studyTime} 分钟哦`, "info");
    playAudioMessage(null, "喵～番茄时钟开始啦！.mp3");
}

/**
 * 更新计时器显示
 */
function updateTimerDisplay() {
    if (!timerCountdown || !timerStatus || !timerContainer) return;
    
    timerCountdown.textContent = formatTime(pomodoroState.remainingSeconds);
    timerStatus.textContent = pomodoroState.isBreak ? "休息中" : "学习中";
    
    // 更新计时器样式
    timerContainer.className = "timer-container " + (pomodoroState.isBreak ? "break-mode" : "study-mode");
    
    // 更新暂停按钮
    if (pauseTimerBtn) {
        pauseTimerBtn.textContent = pomodoroState.isPaused ? "▶️" : "⏯️";
    }
    
    // 保存状态到本地存储
    savePomodoroState();
}

/**
 * 开始计时器
 */
function startTimer() {
    // 清除已有计时器
    if (pomodoroState.timerId) {
        clearInterval(pomodoroState.timerId);
    }
    
    pomodoroState.timerId = setInterval(function() {
        if (pomodoroState.isPaused) return;
        
        pomodoroState.remainingSeconds--;
        updateTimerDisplay();
        
        if (pomodoroState.remainingSeconds <= 0) {
            // 时间到，切换模式
            pomodoroState.isBreak = !pomodoroState.isBreak;
            
            if (pomodoroState.isBreak) {
                // 切换到休息模式
                pomodoroState.remainingSeconds = pomodoroState.breakMinutes * 60;
                showMessage("休息时间到啦！去伸展一下身体吧～", "success");
                playAudioMessage(null, "喵～休息时间到啦！伸展一下身体吧～.mp3");
                playNotificationSound();
            } else {
                // 切换到学习模式
                pomodoroState.remainingSeconds = pomodoroState.studyMinutes * 60;
                showMessage("该学习啦！加油哦～", "info");
                playAudioMessage(null, "喵～该学习啦！加油哦～.mp3");
                playNotificationSound();
            }
            
            updateTimerDisplay();
            savePomodoroState(); // 保存状态切换
        }
    }, 1000);
}

/**
 * 暂停/恢复计时器
 */
function togglePauseTimer() {
    pomodoroState.isPaused = !pomodoroState.isPaused;
    savePomodoroState(); // 保存暂停状态
    
    showMessage(pomodoroState.isPaused ? "计时暂停啦" : "计时继续啦", "info");
    
    if (pauseTimerBtn) {
        pauseTimerBtn.textContent = pomodoroState.isPaused ? "▶️" : "⏯️";
    }
}

/**
 * 停止计时器
 */
function stopTimer() {
    if (pomodoroState.isActive) {
        clearInterval(pomodoroState.timerId);
        pomodoroState.isActive = false;
        pomodoroState.timerId = null;
        
        if (timerContainer) {
            timerContainer.style.display = "none";
        }
        
        savePomodoroState(); // 保存停止状态
        showMessage("番茄时钟已停止", "info");
    }
}

/**
 * 保存番茄时钟配置到本地存储
 */
function savePomodoroConfig() {
    const config = {
        studyMinutes: pomodoroState.studyMinutes,
        breakMinutes: pomodoroState.breakMinutes
    };
    saveToStorage(STORAGE_KEYS.POMODORO_CONFIG, config);
}

/**
 * 保存番茄时钟状态到本地存储
 */
function savePomodoroState() {
    const stateToSave = {
        isActive: pomodoroState.isActive,
        isPaused: pomodoroState.isPaused,
        isBreak: pomodoroState.isBreak,
        remainingSeconds: pomodoroState.remainingSeconds,
        lastUpdate: Date.now()
    };
    saveToStorage(STORAGE_KEYS.POMODORO_STATE, stateToSave);
}

/**
 * 恢复番茄时钟配置
 */
function restorePomodoroConfig() {
    const savedConfig = getFromStorage(STORAGE_KEYS.POMODORO_CONFIG);
    if (savedConfig) {
        try {
            pomodoroState.studyMinutes = savedConfig.studyMinutes || 25;
            pomodoroState.breakMinutes = savedConfig.breakMinutes || 5;
            
            // 更新输入框值
            const studyTimeInput = document.getElementById(DOM_IDS.STUDY_TIME);
            const breakTimeInput = document.getElementById(DOM_IDS.BREAK_TIME);
            
            if (studyTimeInput) {
                studyTimeInput.value = pomodoroState.studyMinutes;
            }
            
            if (breakTimeInput) {
                breakTimeInput.value = pomodoroState.breakMinutes;
            }
        } catch (e) {
            console.error("恢复番茄时钟配置出错:", e);
        }
    }
}

/**
 * 恢复番茄时钟状态
 */
function restorePomodoroState() {
    const savedState = getFromStorage(STORAGE_KEYS.POMODORO_STATE);
    if (savedState && savedState.isActive) {
        try {
            // 计算经过的时间
            const elapsedSeconds = Math.floor((Date.now() - savedState.lastUpdate) / 1000);
            let remainingSeconds = savedState.remainingSeconds - elapsedSeconds;
            
            // 如果番茄钟已经过期，不恢复状态
            if (remainingSeconds <= 0) {
                showMessage("你之前的番茄时钟已经结束了～", "info");
                return;
            }
            
            // 恢复状态
            pomodoroState.isActive = true;
            pomodoroState.isPaused = savedState.isPaused;
            pomodoroState.isBreak = savedState.isBreak;
            pomodoroState.remainingSeconds = remainingSeconds;
            
            // 更新显示并启动计时器
            updateTimerDisplay();
            startTimer();
            
            // 显示计时器
            if (timerContainer) {
                timerContainer.style.display = "flex";
            }
            
            showMessage(`恢复了你的${savedState.isBreak ? "休息" : "学习"}时间～`, "success");
        } catch (e) {
            console.error("恢复番茄时钟状态出错:", e);
        }
    }
}

/**
 * 获取当前番茄钟状态
 */
export function getPomodoroState() {
    return { ...pomodoroState };
}

/**
 * 设置番茄钟配置
 */
export function setPomodoroConfig(studyMinutes, breakMinutes) {
    if (studyMinutes) pomodoroState.studyMinutes = studyMinutes;
    if (breakMinutes) pomodoroState.breakMinutes = breakMinutes;
    savePomodoroConfig();
    return getPomodoroState();
}

/**
 * 立即结束当前番茄周期并切换到下一个状态
 */
export function finishCurrentCycle() {
    if (!pomodoroState.isActive) return false;
    
    pomodoroState.isBreak = !pomodoroState.isBreak;
    
    if (pomodoroState.isBreak) {
        pomodoroState.remainingSeconds = pomodoroState.breakMinutes * 60;
        showMessage("提前进入休息时间～", "info");
    } else {
        pomodoroState.remainingSeconds = pomodoroState.studyMinutes * 60;
        showMessage("提前结束休息，回到学习时间～", "info");
    }
    
    updateTimerDisplay();
    savePomodoroState();
    
    return true;
}

/**
 * 清理番茄时钟资源
 */
export function cleanupPomodoro() {
    if (pomodoroState.timerId) {
        clearInterval(pomodoroState.timerId);
        pomodoroState.timerId = null;
    }
    
    // 移除事件监听
    const pomodoroBtn = document.getElementById(DOM_IDS.POMODORO_BUTTON);
    if (pomodoroBtn) {
        pomodoroBtn.removeEventListener("click", openPomodoroModal);
    }
    
    const closeModal = document.querySelector(".close-modal");
    if (closeModal) {
        closeModal.removeEventListener("click", closePomodoroModal);
    }
    
    window.removeEventListener("click", function(event) {
        if (event.target === pomodoroModal) {
            closePomodoroModal();
        }
    });
}
