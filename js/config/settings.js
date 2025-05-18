/**
 * 应用设置
 * 包含可配置的应用设置和默认值
 */

export const DEFAULT_SETTINGS = {
    // 番茄钟默认设置
    pomodoro: {
        studyMinutes: 25,
        breakMinutes: 5
    },
    
    // 音频设置
    audio: {
        enabled: false,
        volume: 1.0,
        audioPath: 'Audio/'
    },
    
    // UI设置
    ui: {
        // 默认使用系统主题设置
        darkMode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
        animation: true,
        messageDisplayTime: 3000 // 消息显示时间（毫秒）
    },
    
    // 答题设置
    quiz: {
        shuffleQuestions: true,  // 随机排序题目
        autoFocus: true,         // 自动聚焦到输入框
        caseSensitive: false     // 大小写敏感
    }
};

// 获取当前应用设置（合并默认设置和存储的设置）
export function getCurrentSettings() {
    try {
        const storedSettings = JSON.parse(localStorage.getItem('english_review_settings') || '{}');
        // 深度合并默认设置和存储的设置
        return deepMerge(DEFAULT_SETTINGS, storedSettings);
    } catch (error) {
        console.error("读取设置出错，使用默认设置", error);
        return { ...DEFAULT_SETTINGS };
    }
}

// 保存设置
export function saveSettings(settings) {
    try {
        localStorage.setItem('english_review_settings', JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error("保存设置出错", error);
        return false;
    }
}

// 深度合并对象
function deepMerge(target, source) {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    
    return output;
}

// 检查是否为对象
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}
