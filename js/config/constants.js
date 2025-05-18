/**
 * 应用常量定义
 */

// 本地存储键名
export const STORAGE_KEYS = {
    POMODORO_CONFIG: 'english_review_pomodoro_config',
    POMODORO_STATE: 'english_review_pomodoro_state',
    WRONG_ANSWERS: 'english_review_wrong_answers',
    CURRENT_FILE: 'english_review_current_file',
    AUDIO_ENABLED: 'english_review_audio_enabled'
};

// DOM 元素 ID
export const DOM_IDS = {
    // 主要容器
    CONTAINER: 'container',
    MESSAGE: 'message',
    
    // 选择器和内容
    FILE_SELECTOR: 'file-selector',
    CHINESE_TEXT: 'chinese-text',
    ANSWER_INPUT: 'answer-input',
    
    // 进度
    PROGRESS_BAR: 'progress-bar-inner',
    PROGRESS_TEXT: 'progress-text',
    
    // 按钮
    SUBMIT_BUTTON: 'submit-button',
    RETRY_BUTTON: 'retry-button',
    EXPORT_BUTTON: 'export-button',
    IMPORT_BUTTON: 'import-button',
    IMPORT_FILE_INPUT: 'import-file-input',
    THEME_TOGGLE: 'theme-toggle',
    AUDIO_TOGGLE: 'audio-toggle',
    
    // 番茄钟相关
    POMODORO_BUTTON: 'pomodoro-button',
    POMODORO_MODAL: 'pomodoro-modal',
    START_POMODORO: 'start-pomodoro',
    STUDY_TIME: 'study-time',
    BREAK_TIME: 'break-time',
    TIMER_CONTAINER: 'pomodoro-timer',
    TIMER_COUNTDOWN: 'timer-countdown',
    TIMER_STATUS: 'timer-status',
    PAUSE_TIMER: 'pause-timer',
    STOP_TIMER: 'stop-timer',
    
    // 错题列表
    ERROR_LIST: 'error-list',
    ERROR_ITEMS: 'error-items'
};

// 猫娘风格的提示前缀
export const CAT_PREFIXES = ["喵～", "呜喵～", "喵喵～", "喵呜～", "nya～"];

// 音频文件映射表
export const AUDIO_MAPPINGS = [
    { keywords: ["开始练习错题", "加油"], filename: "喵～开始练习错题啦！加油哦～.mp3" },
    { keywords: ["没有错题需要重做", "太厉害"], filename: "喵～没有错题需要重做呢，太厉害啦！.mp3" },
    { keywords: ["没有错题可以导出"], filename: "喵呜～没有错题可以导出呢.mp3" },
    { keywords: ["已加载", "题目等着你"], filename: "喵～已加载所选文档，这些题目等着你来解答喵！.mp3" },
    { keywords: ["答错了", "正确答案"], filename: "喵喵～ 呜呜～答错了呢...正确答案是这个.mp3" },
    { keywords: ["错题导出成功", "复习"], filename: "喵～错题导出成功啦喵～啦！可以回去好好复习哦～.mp3" },
    { keywords: ["答对啦", "太聪明了"], filename: "答对了喵~.mp3" },
    { keywords: ["完成了所有题目"], filename: "喵～已完成所有题目喵～.mp3" },
    { keywords: ["太厉害了", "都改正啦"], filename: "喵～太厉害了！都改正啦！.mp3" },
    { keywords: ["番茄时钟开始啦"], filename: "喵～番茄时钟开始啦！.mp3" },
    { keywords: ["该学习啦", "加油"], filename: "喵～该学习啦！加油哦～.mp3" },
    { keywords: ["休息时间到啦"], filename: "喵～休息时间到啦！伸展一下身体吧～.mp3" }
];

// 背景图片设置
export const BACKGROUND_IMAGES = {
    PORTRAIT: "https://tse1-mm.cn.bing.net/th/id/OIP-C.ou_YfaL0ItK-fTJeQIrzywHaNK?rs=1&pid=ImgDetMain",
    LANDSCAPE: "https://upload-bbs.miyoushe.com/upload/2024/06/19/357876319/0e3f34f4cc8e630e07b53fa7e5031eb1_1173320463818551770.jpg"
};

// 答案评分设置
export const ANSWER_SETTINGS = {
    // 要在比较中忽略的词
    IGNORE_WORDS: ["the", "a", "an"]
};
