/**
 * 设置管理器
 * 负责应用设置的存储和管理
 */

export class SettingsManager {
    constructor() {
        this.storageKey = 'english_review_settings_v2';
        this.defaultSettings = {
            apiKey: '',
            aiModel: 'Qwen/Qwen2.5-7B-Instruct',
            enableAIGrading: false,
            autoNext: true,
            showHints: false,
            theme: 'auto', // auto, light, dark
            soundEnabled: false,
            animationEnabled: true,
            studyMode: 'normal', // normal, quick, detailed
            difficulty: 'medium', // easy, medium, hard
            language: 'zh-CN',
            reminderEnabled: false,
            reminderInterval: 30, // 分钟
            backupEnabled: false
        };
        
        this.settings = this.loadSettings();
    }
    
    /**
     * 获取设置
     */
    getSettings() {
        return { ...this.settings };
    }
    
    /**
     * 获取单个设置
     */
    getSetting(key) {
        return this.settings[key];
    }
    
    /**
     * 保存设置
     */
    saveSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
            this.onSettingsChanged(newSettings);
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            return false;
        }
    }
    
    /**
     * 更新单个设置
     */
    updateSetting(key, value) {
        this.settings[key] = value;
        return this.saveSettings({ [key]: value });
    }
    
    /**
     * 加载设置
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...this.defaultSettings, ...parsed };
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
        
        return { ...this.defaultSettings };
    }
    
    /**
     * 重置设置
     */
    resetSettings() {
        this.settings = { ...this.defaultSettings };
        
        try {
            localStorage.removeItem(this.storageKey);
            this.onSettingsChanged(this.settings);
            return true;
        } catch (error) {
            console.error('重置设置失败:', error);
            return false;
        }
    }
    
    /**
     * 导出设置
     */
    exportSettings() {
        try {
            const dataStr = JSON.stringify(this.settings, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `english_review_settings_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error('导出设置失败:', error);
            return false;
        }
    }
    
    /**
     * 导入设置
     */
    async importSettings(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.name.endsWith('.json')) {
                reject(new Error('请选择有效的JSON文件'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    
                    // 验证导入的设置
                    if (this.validateSettings(imported)) {
                        this.settings = { ...this.defaultSettings, ...imported };
                        localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
                        this.onSettingsChanged(this.settings);
                        resolve(this.settings);
                    } else {
                        reject(new Error('设置文件格式不正确'));
                    }
                } catch (error) {
                    reject(new Error('文件解析失败: ' + error.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsText(file);
        });
    }
    
    /**
     * 验证设置格式
     */
    validateSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            return false;
        }
        
        // 检查必要的设置项
        const requiredKeys = ['apiKey', 'aiModel', 'enableAIGrading'];
        for (const key of requiredKeys) {
            if (!(key in settings)) {
                return false;
            }
        }
        
        // 检查数据类型
        if (typeof settings.enableAIGrading !== 'boolean') return false;
        if (typeof settings.autoNext !== 'boolean' && 'autoNext' in settings) return false;
        if (typeof settings.showHints !== 'boolean' && 'showHints' in settings) return false;
        
        return true;
    }
    
    /**
     * 获取API密钥（脱敏显示）
     */
    getMaskedApiKey() {
        const apiKey = this.settings.apiKey;
        if (!apiKey || apiKey.length < 8) {
            return '';
        }
        
        return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
    }
    
    /**
     * 验证API密钥格式
     */
    validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return { valid: false, message: 'API Key不能为空' };
        }
        
        if (apiKey.length < 20) {
            return { valid: false, message: 'API Key长度太短' };
        }
        
        if (!/^[a-zA-Z0-9\-_]+$/.test(apiKey)) {
            return { valid: false, message: 'API Key格式不正确' };
        }
        
        return { valid: true, message: 'API Key格式正确' };
    }
    
    /**
     * 获取主题设置
     */
    getTheme() {
        const theme = this.settings.theme;
        if (theme === 'auto') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
    }
    
    /**
     * 应用主题
     */
    applyTheme() {
        const theme = this.getTheme();
        document.documentElement.setAttribute('data-theme', theme);
        
        // 更新meta标签
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.content = theme === 'dark' ? '#1f2937' : '#667eea';
        }
    }
    
    /**
     * 设置变更回调
     */
    onSettingsChanged(changedSettings) {
        // 应用主题变更
        if ('theme' in changedSettings) {
            this.applyTheme();
        }
        
        // 应用动画设置
        if ('animationEnabled' in changedSettings) {
            document.body.classList.toggle('no-animations', !changedSettings.animationEnabled);
        }
        
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('settingsChanged', {
            detail: { settings: this.settings, changed: changedSettings }
        }));
    }
    
    /**
     * 获取学习统计设置
     */
    getStudySettings() {
        return {
            studyMode: this.settings.studyMode,
            difficulty: this.settings.difficulty,
            autoNext: this.settings.autoNext,
            showHints: this.settings.showHints
        };
    }
    
    /**
     * 获取提醒设置
     */
    getReminderSettings() {
        return {
            enabled: this.settings.reminderEnabled,
            interval: this.settings.reminderInterval
        };
    }
    
    /**
     * 获取备份设置
     */
    getBackupSettings() {
        return {
            enabled: this.settings.backupEnabled
        };
    }
    
    /**
     * 检查设置完整性
     */
    checkIntegrity() {
        const issues = [];
        
        // 检查API设置
        if (this.settings.enableAIGrading && !this.settings.apiKey) {
            issues.push('启用了AI判题但未设置API Key');
        }
        
        // 检查模型设置
        const supportedModels = ['Qwen/Qwen3-8B', 'Qwen/Qwen2-7B', 'Qwen/Qwen2.5-7B-Instruct', 'meta-llama/Llama-3-8B-Instruct'];
        if (!supportedModels.includes(this.settings.aiModel)) {
            issues.push('AI模型设置不正确');
        }
        
        return {
            valid: issues.length === 0,
            issues: issues
        };
    }
}
