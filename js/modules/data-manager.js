/**
 * 数据管理器
 * 负责管理题目数据和年级单元结构
 * 支持分年级分单元的文件结构
 */

export class DataManager {
    constructor() {
        this.loadedUnits = new Map(); // 缓存已加载的单元数据
        this.unitFiles = {}; // 单元文件映射，将从服务器加载
        this.scanUnitFiles(); // 异步扫描所有单元文件
    }

    /**
     * 扫描所有单元文件（从服务器API获取）
     */
    async scanUnitFiles() {
        try {
            // 尝试从服务器API获取单元列表
            const response = await fetch('/api/scan-units');
            if (response.ok) {
                const units = await response.json();
                this.unitFiles = units;
                console.log('成功从服务器加载单元列表:', units);
                return units;
            } else {
                console.warn('无法从服务器获取单元列表，使用默认列表');
                this.unitFiles = this.getDefaultUnitFiles();
                return this.unitFiles;
            }
        } catch (error) {
            console.warn('扫描单元文件失败，使用默认列表:', error);
            // 如果服务器不可用，使用默认列表作为后备
            this.unitFiles = this.getDefaultUnitFiles();
            return this.unitFiles;
        }
    }

    /**
     * 获取默认的单元文件列表（作为后备）
     */
    getDefaultUnitFiles() {
        return {
            '7': {
                'Up': ['U1-1'],
                'Down': []
            },
            '8': {
                'Up': [],
                'Down': ['U1-reading', 'U1-speaking', 'U1-viewing-listening', 
                         'U2-reading', 'U2-viewing-listening', 
                         'U3-reading', 'U3-speaking', 'U3-viewing-listening']
            }
        };
    }

	/**
	 * 将阿拉伯数字年级映射到实际目录名
	 */
	getGradeDirectory(grade) {
		const map = {
			'7': '七年级',
			'8': '八年级'
		};
		return map[grade] || grade;
	}

    /**
     * 动态加载单元数据
     */
    async loadUnitData(grade, semester, unit) {
        const key = `${grade}-${semester}-${unit}`;

        // 检查缓存
        if (this.loadedUnits.has(key)) {
            return this.loadedUnits.get(key);
        }

        // 构建文件路径（年级目录为中文，且以站点根相对路径加载）
        const gradeDir = this.getGradeDirectory(grade);
        const filePath = `data/${gradeDir}/${semester}/${unit}.js`;

        try {
            // 使用 fetch 加载模块内容（相对站点根，无需 ../../）
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const code = await response.text();
            // 兼容 CommonJS 与 UMD 风格导出
            const moduleFunction = new Function('exports', 'module', code + '; return module.exports || exports;');
            const module = { exports: {} };
            const exportsObj = {};
            const result = moduleFunction(exportsObj, module) || {};
            const unitData = (result && result.unitData)
                || (module && module.exports && module.exports.unitData)
                || (typeof window !== 'undefined' ? window.unitData : undefined);
            if (typeof window !== 'undefined' && window.unitData) {
                try { delete window.unitData; } catch (_) { /* ignore */ }
            }

            // 转换为旧的格式以保持兼容性
            const questions = this.convertToLegacyFormat(unitData);

            // 缓存数据
            this.loadedUnits.set(key, questions);

            return questions;
        } catch (error) {
            console.error(`加载单元数据失败: ${filePath}`, error);

            // 返回空数组而不是抛出错误，保持应用的稳定性
            return [];
        }
    }

    /**
     * 将新格式转换为旧格式以保持兼容性
     */
    convertToLegacyFormat(unitData) {
        const questions = [];

        // 处理词汇部分
        if (unitData.vocabulary) {
            unitData.vocabulary.forEach(item => {
                questions.push({
                    chinese: item.chinese,
                    english: Array.isArray(item.english) ? item.english : [item.english]
                });
            });
        }

        return questions;
    }
    
    /**
     * 获取指定年级的所有单元
     */
    getUnitsForGrade(grade) {
        // 如果单元文件还未加载，返回空对象
        if (!this.unitFiles || Object.keys(this.unitFiles).length === 0) {
            // 尝试同步加载（如果可能）
            if (this.unitFiles === undefined) {
                this.unitFiles = {};
            }
            return {};
        }
        return this.unitFiles[grade] || {};
    }

    /**
     * 获取指定单元的所有题目
     */
    async getQuestionsForUnit(grade, unitPath) {
        const [semester, unit] = unitPath.split('/');
        const questions = await this.loadUnitData(grade, semester, unit);

        if (!questions || questions.length === 0) {
            console.error(`未找到题目数据: ${grade}年级 ${semester} ${unit}`);
            return [];
        }

        // 返回题目，不进行随机打乱
        return [...questions];
    }
    
    /**
     * 随机打乱数组
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    /**
     * 获取所有年级数据
     */
    getAllGradeData() {
        return this.gradeData;
    }
    
    /**
     * 添加自定义题目
     */
    addCustomQuestion(grade, semester, unit, question) {
        if (!this.gradeData[grade]) {
            this.gradeData[grade] = {};
        }
        if (!this.gradeData[grade][semester]) {
            this.gradeData[grade][semester] = {};
        }
        if (!this.gradeData[grade][semester][unit]) {
            this.gradeData[grade][semester][unit] = [];
        }
        
        this.gradeData[grade][semester][unit].push(question);
        this.saveToLocalStorage();
    }
    
    /**
     * 保存数据到本地存储
     */
    saveToLocalStorage() {
        try {
            localStorage.setItem('english_review_custom_data', JSON.stringify(this.gradeData));
        } catch (error) {
            console.error('保存数据失败:', error);
        }
    }
    
    /**
     * 从本地存储加载数据
     */
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('english_review_custom_data');
            if (saved) {
                const customData = JSON.parse(saved);
                // 合并自定义数据
                Object.keys(customData).forEach(grade => {
                    if (this.gradeData[grade]) {
                        Object.keys(customData[grade]).forEach(semester => {
                            if (this.gradeData[grade][semester]) {
                                Object.keys(customData[grade][semester]).forEach(unit => {
                                    if (this.gradeData[grade][semester][unit]) {
                                        // 合并题目，去重
                                        const existing = this.gradeData[grade][semester][unit];
                                        const custom = customData[grade][semester][unit];
                                        const merged = [...existing];
                                        
                                        custom.forEach(q => {
                                            if (!existing.some(e => e.chinese === q.chinese)) {
                                                merged.push(q);
                                            }
                                        });
                                        
                                        this.gradeData[grade][semester][unit] = merged;
                                    }
                                });
                            }
                        });
                    }
                });
            }
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }
}
