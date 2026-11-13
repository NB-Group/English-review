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
                'Up': ['U4-reading', 'U4-speaking', 'U1-reading', 'U1-speaking', 'U1-viewing-listening', 
                       'U2-reading', 'U2-viewing-listening', 
                       'U3-reading', 'U3-speaking', 'U3-viewing-listening',
                       'U5-viewing-listening'],
                'Down': []
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

        // 处理词性转换部分
        if (unitData.wordForms) {
            unitData.wordForms.forEach(wordForm => {
                if (!wordForm || !Array.isArray(wordForm.forms)) {
                    return;
                }

                wordForm.forms.forEach(formEntry => {
                    if (!formEntry || !formEntry.form) {
                        return;
                    }

                    const typeLabel = this.formatWordType(formEntry.type);
                    const chineseMeaning = formEntry.chinese || wordForm.word || '';
                    const typeSuffix = typeLabel ? `（${typeLabel}）` : '';
                    const questionPrefix = wordForm.word ? `【词性转换】${wordForm.word}` : '【词性转换】';
                    questions.push({
                        chinese: `${questionPrefix}${typeSuffix ? ` ${typeSuffix}` : ''}：${chineseMeaning}`,
                        english: [formEntry.form]
                    });
                });
            });
        }

        return questions;
    }

    /**
     * 将词性类型转换为常见缩写
     */
    formatWordType(type) {
        if (!type) return '';
        const normalized = type.toLowerCase();
        const typeMap = {
            noun: 'n.',
            verb: 'v.',
            adjective: 'adj.',
            adverb: 'adv.',
            pronoun: 'pron.',
            preposition: 'prep.',
            conjunction: 'conj.',
            interjection: 'interj.',
            article: 'art.',
            negative: 'neg.'
        };
        return typeMap[normalized] || type;
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
     * 获取指定单元的原始结构化数据
     */
    async getRawUnitData(grade, unitPath) {
        const [semester, unit] = unitPath.split('/');
        const gradeDir = this.getGradeDirectory(grade);
        const filePath = `data/${gradeDir}/${semester}/${unit}.js`;

        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const code = await response.text();
            const moduleFunction = new Function('exports', 'module', code + '; return module.exports || exports;');
            const module = { exports: {} };
            const exportsObj = {};
            const result = moduleFunction(exportsObj, module) || {};
            const unitData = (result && result.unitData)
                || (module && module.exports && module.exports.unitData)
                || (typeof window !== 'undefined' ? window.unitData : undefined);
            if (typeof window !== 'undefined' && window.unitData) {
                try { delete window.unitData; } catch (_) {}
            }
            return unitData || null;
        } catch (error) {
            console.error(`加载原始单元数据失败: ${filePath}`, error);
            return null;
        }
    }
    
    async getTransformQuestionsForUnit(grade, unitPath) {
        const [semester, unit] = unitPath.split('/');
        const gradeDir = this.getGradeDirectory(grade);
        const filePath = `data/${gradeDir}/${semester}/transform/${unit}.json`;

        try {
            const response = await fetch(filePath, { cache: 'no-cache' });
            if (!response.ok) {
                return [];
            }

            const data = await response.json();

            // 支持新格式 transformGroups 和旧格式 transformQuestions
            const groups = Array.isArray(data.transformGroups) ? data.transformGroups
                : Array.isArray(data.transformQuestions) ? this._convertLegacyGroups(data.transformQuestions)
                : [];

            const questions = [];
            for (const group of groups) {
                const source = String(group.source || '').trim();
                const sourcePos = String(group.sourcePos || '').trim();
                const sourceMeaning = String(group.sourceMeaning || '').trim();
                const transforms = Array.isArray(group.transforms) ? group.transforms : [];

                for (const t of transforms) {
                    const target = String(t.form || '').trim();
                    const targetType = String(t.type || '').trim() || '对应词形';
                    const targetMeaning = String(t.meaning || '').trim();
                    if (!target) continue;
                    if (source.toLowerCase() === target.toLowerCase()) continue;

                    const chinese = `[词转特训] ${source}${sourcePos ? ' ' + sourcePos : ''}${sourceMeaning ? ' ' + sourceMeaning : ''} → ${targetType}`;

                    questions.push({
                        chinese: chinese,
                        english: [target],
                        sourceWord: source,
                        sourcePos: sourcePos,
                        sourceMeaning: sourceMeaning,
                        targetWord: target,
                        targetType: targetType,
                        targetMeaning: targetMeaning,
                    });
                }
            }
            return questions;
        } catch (error) {
            console.warn(`加载词转数据失败: ${filePath}`, error);
            return [];
        }
    }

    /** 兼容旧格式 transformQuestions → 模拟 transformGroups */
    _convertLegacyGroups(questions) {
        const map = new Map();
        for (const q of questions) {
            const source = String(q.source || '').trim();
            const target = String(q.target || '').trim();
            if (!source || !target) continue;
            if (!map.has(source)) {
                map.set(source, {
                    source,
                    sourcePos: q.source_pos || '',
                    sourceMeaning: q.source_meaning || '',
                    transforms: [],
                });
            }
            map.get(source).transforms.push({
                type: q.target_pos || '对应词形',
                form: target,
            });
        }
        return Array.from(map.values());
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
