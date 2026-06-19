/**
 * 英语复习助手 - 重构版
 * 现代化的英语学习应用，支持年级选择、AI判题等功能
 */

// 导入模块
import { DataManager } from './modules/data-manager.js';
import { UIManager } from './modules/ui-manager.js';
import { AIGrader } from './modules/ai-grader.js';
import { SettingsManager } from './modules/settings-manager.js';
import { StatsManager } from './modules/stats-manager.js';

export class EnglishReviewApp {
    constructor() {
        this.dataManager = new DataManager();
        this.uiManager = new UIManager();
        this.aiGrader = new AIGrader();
        this.settingsManager = new SettingsManager();
        this.statsManager = new StatsManager();

        this.currentGrade = null;
        this.currentSemester = null; // 当前选中的学期
        this.currentUnit = null;
        this.studyMode = 'normal';
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.sessionStats = {
            total: 0,
            correct: 0,
            wrong: 0,
            wrongAnswers: []
        };
        this.autoNextTimer = null; // 自动下一题定时器
        this.currentPage = 'grade-selection'; // 当前页面状态
        this._prefillCursorPos = null; // 预填光标位置标记

        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.migrateGrade8Progress(); // 迁移八年级进度
        this.restoreLearningProgress().catch(error => {
            console.error('恢复学习进度失败:', error);
        }); // 恢复学习进度
        this.updateNotebookBadge(); // 更新错题本徽章
    }
    
    setupEventListeners() {
        // Grade and Semester Selection (New Design)
        document.querySelectorAll('.semester-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                
                // Find the parent grade item or use dataset directly
                const grade = e.currentTarget.dataset.grade;
                const semester = e.currentTarget.dataset.semester;
                
                // Save current selection
                this.currentGrade = grade;
                this.currentSemester = semester;
                this.studyMode = 'normal';
                this.saveLearningProgress();
                
                // Navigate to unit selection
                this.showUnitSelection();
            });
        });
        
        // Back Button
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.goBack();
            });
        });
        
        // Notebook Button (Top Bar)
        const notebookBtn = document.getElementById('notebook-btn');
        if (notebookBtn) {
            notebookBtn.addEventListener('click', () => {
                this.showNotebook();
            });
        }
        
        // Settings Button (Top Bar)
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }
        
        // Submit Answer
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.submitAnswer();
            });
        }

        // Skip Question
        const skipBtn = document.getElementById('skip-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                this.skipQuestion();
            });
        }
        
        // Next Question
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextQuestion();
            });
        }
        
        // Input Enter Key
        const answerInput = document.getElementById('answer-input');
        if (answerInput) {
            answerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !answerInput.disabled) {
                    e.preventDefault();
                    this.submitAnswer();
                }
            });
            
            // 聚焦时光标保持在当前位置（配合预填充等逻辑）
            answerInput.addEventListener('focus', (e) => {
                const len = e.target.value.length;
                if (len > 0 && this._prefillCursorPos === null) {
                    e.target.setSelectionRange(len, len);
                }
            });
        }
        
        // Previous Question Button
        const prevBtn = document.getElementById('prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.prevQuestion();
            });
        }

        // Restart Button
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.restartCurrentSession();
            });
        }
        
        // Retry Wrong Answers
        const retryBtn = document.getElementById('retry-wrong-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.retryWrongAnswers();
            });
        }
        
        // Save Settings
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // View Notebook from Stats
        const viewNotebookBtn = document.getElementById('view-notebook-btn');
        if (viewNotebookBtn) {
            viewNotebookBtn.addEventListener('click', () => {
                this.showNotebook();
            });
        }

        // Export Notebook
        const exportBtn = document.getElementById('export-notebook-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportNotebook();
            });
        }

        // Clear Notebook
        const clearBtn = document.getElementById('clear-notebook-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearNotebook();
            });
        }

        const normalModeBtn = document.getElementById('mode-normal-btn');
        const transformModeBtn = document.getElementById('mode-transform-btn');
        if (normalModeBtn && transformModeBtn) {
            normalModeBtn.addEventListener('click', () => {
                this.studyMode = 'normal';
                this.showUnitSelection();
            });
            transformModeBtn.addEventListener('click', () => {
                this.studyMode = 'transform';
                this.showUnitSelection();
            });
        }
    }
    
    goBack() {
        if (this.currentPage === 'unit-selection') {
            this.showGradeSelection();
        } else if (this.currentPage === 'study-page') {
            this.showUnitSelection();
        } else if (this.currentPage === 'stats-page') {
            this.showUnitSelection(); // Back to unit selection makes more sense usually
        } else if (this.currentPage === 'notebook-page' || this.currentPage === 'settings-page') {
            // Return to previous page if possible, or default to home
            // For simplicity, let's go home or unit selection depending on state
            if (this.currentGrade && this.currentUnit) {
                this.showStudyPage();
            } else if (this.currentGrade) {
                this.showUnitSelection();
            } else {
                this.showGradeSelection();
            }
        } else {
            this.showGradeSelection();
        }
    }

    /**
     * Show grade selection page (Home)
     */
    showGradeSelection() {
        this.currentPage = 'grade-selection';
        this.uiManager.showPage('grade-selection');
        this.currentUnit = null; // Reset current unit
        
        // Update home cards status - Not needed in new design as cards are static, 
        // but we might want to show progress eventually. For now, skipping complex updates.
        
        this.saveLearningProgress();
        window.EnglishReview?.accountStorage?.saveRemoteData?.();
    }

    async showUnitSelection() {
        this.currentPage = 'unit-selection';
        
        // Ensure units loaded
        let units = this.dataManager.getUnitsForGrade(this.currentGrade);
        if (!units || Object.keys(units).length === 0) {
            await this.dataManager.scanUnitFiles();
            units = this.dataManager.getUnitsForGrade(this.currentGrade);
        }
        
        // Filter by current semester
        let displayUnits = {};
        if (this.currentSemester && units[this.currentSemester]) {
            displayUnits[this.currentSemester] = units[this.currentSemester];
        } else {
            // Fallback to showing everything if no semester selected (shouldn't happen with new UI)
            displayUnits = units;
        }
        
        this.uiManager.showUnitSelection(this.currentGrade, displayUnits, (unit) => {
            this.selectUnit(unit);
        }, this, this.studyMode);
        this.saveLearningProgress();
        window.EnglishReview?.accountStorage?.saveRemoteData?.();
    }
    
    async selectUnit(unit) {
        this.currentUnit = unit;

        if (this.studyMode === 'transform') {
            this.currentQuestions = await this.getTransformQuestionsForUnit(this.currentGrade, unit);
        } else {
            this.currentQuestions = await this.dataManager.getQuestionsForUnit(this.currentGrade, unit);
        }
        
        // 从unit的独立进度中恢复
        let shouldRestoreProgress = false;
        const progress = this.getUnitProgress(this.currentGrade, unit);
        
        if (progress) {
            // 检查进度是否有效且未过期（24小时内）
            const now = Date.now();
            const hoursDiff = (now - progress.timestamp) / (1000 * 60 * 60);
            
            // 如果已完成，保持完成状态（不重置，避免覆盖完成状态）
            if (progress.isCompleted) {
                // 保持完成状态，currentQuestionIndex 应该等于题目总数
                this.currentQuestionIndex = this.currentQuestions.length;
                // 恢复之前的统计信息，如果没有则使用默认值
                if (progress.sessionStats) {
                    this.sessionStats = {
                        ...progress.sessionStats,
                        total: this.currentQuestions.length
                    };
                } else {
                    this.sessionStats = {
                        total: this.currentQuestions.length,
                        correct: 0,
                        wrong: 0,
                        wrongAnswers: []
                    };
                }
            } else if (progress.currentQuestionIndex > 0 && 
                      progress.currentQuestionIndex < this.currentQuestions.length) {
                // 恢复未完成的进度
                shouldRestoreProgress = true;
                this.currentQuestionIndex = progress.currentQuestionIndex;
                // 恢复统计信息，但要确保总数匹配
                if (progress.sessionStats) {
                    this.sessionStats = {
                        ...progress.sessionStats,
                        total: this.currentQuestions.length
                    };
                } else {
                    this.sessionStats = {
                        total: this.currentQuestions.length,
                        correct: 0,
                        wrong: 0,
                        wrongAnswers: []
                    };
                }
                console.log(`恢复进度：第 ${this.currentQuestionIndex + 1}/${this.currentQuestions.length} 题`);
            } else {
                // 进度过期或无效，从头开始
                this.currentQuestionIndex = 0;
                this.sessionStats = {
                    total: this.currentQuestions.length,
                    correct: 0,
                    wrong: 0,
                    wrongAnswers: []
                };
            }
        } else {
            // 没有保存的进度，从头开始
            this.currentQuestionIndex = 0;
            this.sessionStats = {
                total: this.currentQuestions.length,
                correct: 0,
                wrong: 0,
                wrongAnswers: []
            };
        }

        this.showStudyPage();
        this.displayCurrentQuestion();
        if (shouldRestoreProgress) {
            this.uiManager.showMessage(`已恢复之前的默写进度（第 ${this.currentQuestionIndex + 1} 题）`, 'success');
        }
        this.saveLearningProgress();
        window.EnglishReview?.accountStorage?.saveRemoteData?.();
    }

    async getTransformQuestionsForUnit(grade, unit) {
        return await this.dataManager.getTransformQuestionsForUnit(grade, unit);
    }

    buildWordFormQuestions(wordForms) {
        const questions = [];

        wordForms.forEach((entry) => {
            if (!entry || !entry.word || !Array.isArray(entry.forms)) return;

            entry.forms.forEach((formItem) => {
                if (!formItem || !formItem.form) return;
                const sourceWord = entry.word.trim();
                const targetType = this.humanizeWordType(formItem.type);
                const meaning = this.cleanTransformMeaning(formItem.chinese || '');

                if (this.normalizeAnswer(sourceWord) === this.normalizeAnswer(formItem.form)) {
                    return;
                }

                const promptParts = [`[词转特训] ${sourceWord}`];
                if (targetType) promptParts.push(`(${targetType})`);
                if (meaning) promptParts.push(`-> ${meaning}`);

                questions.push({
                    chinese: promptParts.join(' '),
                    english: [formItem.form],
                    metaKey: `${sourceWord}::${formItem.form}::${targetType}`
                });
            });
        });

        return questions;
    }

    buildVocabularyTransformQuestions(vocabulary) {
        const questions = [];
        const arrowPattern = /\s*(?:->|→|鈫?|→)\s*/;

        vocabulary.forEach((item) => {
            const englishText = Array.isArray(item.english) ? item.english.join(' / ') : (item.english || '');
            const chineseText = item.chinese || '';
            if (!arrowPattern.test(englishText) && !arrowPattern.test(chineseText)) return;

            const englishSegments = englishText.split(arrowPattern).map((part) => part.trim()).filter(Boolean);
            const chineseSegments = chineseText.split(arrowPattern).map((part) => part.trim()).filter(Boolean);
            if (englishSegments.length < 2) return;

            const source = this.parseTransformSegment(englishSegments[0], chineseSegments[0] || '');
            for (let i = 1; i < englishSegments.length; i += 1) {
                const target = this.parseTransformSegment(englishSegments[i], chineseSegments[i] || '');
                if (!source.word || !target.word) continue;
                if (this.normalizeAnswer(source.word) === this.normalizeAnswer(target.word)) continue;

                const promptParts = [`[词转特训] ${source.word}`];
                if (source.type) promptParts.push(`(${source.type})`);
                promptParts.push('->');
                if (target.type) promptParts.push(`写出${target.type}`);
                else promptParts.push('写出对应词形');
                if (target.meaning) promptParts.push(`(${target.meaning})`);

                questions.push({
                    chinese: promptParts.join(' '),
                    english: [target.word],
                    metaKey: `${source.word}::${target.word}::${target.type || ''}`
                });
            }
        });

        return questions;
    }

    parseTransformSegment(englishSegment, chineseSegment) {
        const cleanedEnglish = englishSegment.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
        const wordMatch = cleanedEnglish.match(/[A-Za-z][A-Za-z-]*/);
        const typeMatch = cleanedEnglish.match(/\b(n|v|adj|adv|prep|conj|pron)\.?\b/i);

        return {
            word: wordMatch ? wordMatch[0] : '',
            type: this.humanizeWordType(typeMatch ? typeMatch[1] : ''),
            meaning: this.cleanTransformMeaning(chineseSegment)
        };
    }

    cleanTransformMeaning(text) {
        return (text || '')
            .replace(/\s+/g, ' ')
            .replace(/[()]/g, '')
            .replace(/[：:]+$/g, '')
            .trim();
    }

    humanizeWordType(type) {
        const normalized = String(type || '').toLowerCase().replace(/\./g, '');
        const map = {
            noun: 'noun',
            verb: 'verb',
            adjective: 'adjective',
            adverb: 'adverb',
            pronoun: 'pronoun',
            preposition: 'preposition',
            conjunction: 'conjunction',
            n: 'noun',
            v: 'verb',
            adj: 'adjective',
            adv: 'adverb',
            prep: 'preposition',
            conj: 'conjunction',
            pron: 'pronoun'
        };
        return map[normalized] || normalized;
    }

    deduplicateQuestions(questions) {
        const seen = new Set();
        return questions.filter((question) => {
            const key = question.metaKey || `${question.chinese}::${(question.english || []).join('|')}`;
            if (seen.has(key)) return false;
            seen.add(key);
            delete question.metaKey;
            return true;
        });
    }
    
    showStudyPage() {
        this.currentPage = 'study-page';
        this.uiManager.showPage('study-page');
        this.saveLearningProgress();
        window.EnglishReview?.accountStorage?.saveRemoteData?.();
    }
    
    displayCurrentQuestion() {
        if (!this.currentQuestions || !Array.isArray(this.currentQuestions) || this.currentQuestions.length === 0) {
            console.warn('当前没有可显示的题目，返回年级选择页面');
            const message = this.studyMode === 'transform'
                ? '这个单元暂时没有词转数据，请先运行词转提取脚本'
                : '未找到题目数据，请重新选择单元';
            this.uiManager.showMessage(message, 'warning');
            this.showUnitSelection();
            return;
        }

        if (this.currentQuestionIndex >= this.currentQuestions.length) {
            // 标记为已完成
            this.currentQuestionIndex = this.currentQuestions.length;
            this.saveLearningProgress(); // 保存完成状态
            this.showStats();
            return;
        }

        const question = this.currentQuestions[this.currentQuestionIndex];
        const progress = {
            current: this.currentQuestionIndex + 1,
            total: this.currentQuestions.length,
            percentage: ((this.currentQuestionIndex + 1) / this.currentQuestions.length) * 100
        };

        // 词转特训：智能预填充
        let prefill = '';
        let cursorPos = 0;
        if (this.studyMode === 'transform' && question.sourceWord && question.targetWord) {
            const src = question.sourceWord;
            const tgt = question.targetWord;

            if (tgt.toLowerCase().endsWith(src.toLowerCase())) {
                // 目标词以源词结尾，如 comfortable → uncomfortable
                // 预填源词，光标在开头，让用户打前缀
                prefill = src;
                cursorPos = 0;
            } else {
                // 找共同前缀，如 happy → happiness 预填 "happ"，光标在末尾
                prefill = this.getCommonPrefix(src, tgt);
                cursorPos = prefill.length;
            }
        }

        // 使用requestAnimationFrame确保流畅的UI更新
        requestAnimationFrame(() => {
            this.uiManager.displayQuestion(question, progress, this.studyMode === 'transform');
            this.uiManager.hideResult();

            // 预填充
            if (prefill) {
                const input = document.getElementById('answer-input');
                if (input) {
                    input.value = prefill;
                    input.setSelectionRange(cursorPos, cursorPos);
                }
            }
            // 标记预填光标位置，防止 focus 事件覆盖
            this._prefillCursorPos = cursorPos;

            // 延迟聚焦，确保输入框已启用
            setTimeout(() => {
                this.uiManager.focusInput();
                // 延迟清除标记，确保 focus 事件先触发
                setTimeout(() => { this._prefillCursorPos = null; }, 50);
            }, 100);
        });
    }

    /** 计算两个单词的最长共同前缀（不区分大小写） */
    getCommonPrefix(a, b) {
        let i = 0;
        const maxLen = Math.min(a.length, b.length);
        while (i < maxLen && a[i].toLowerCase() === b[i].toLowerCase()) {
            i++;
        }
        return a.substring(0, i);
    }
    
    async submitAnswer() {
        const userAnswer = this.uiManager.getUserInput().trim();
        if (!userAnswer) {
            this.uiManager.showMessage('请输入答案', 'warning');
            return;
        }

        const question = this.currentQuestions[this.currentQuestionIndex];
        const settings = this.settingsManager.getSettings();

        let isCorrect = false;
        let feedback = '';

        // 显示loading状态
        this.uiManager.showLoading();

        try {
            const exactMatch = this.gradeAnswerTraditional(question, userAnswer);

            if (exactMatch) {
                isCorrect = true;
                feedback = '';
            } else if (settings.enableAIGrading && settings.apiKey && this.studyMode !== 'transform') {
                // 使用AI判题（词转特训不使用AI，答案必须精确匹配）
                try {
                    const result = await this.aiGrader.gradeAnswer(question, userAnswer, settings);
                    isCorrect = result.isCorrect;
                    feedback = result.feedback;
                } catch (error) {
                    console.error('AI判题失败，使用传统判题:', error);
                    isCorrect = false;
                }
            } else {
                // 传统判题
                isCorrect = false;
            }

            this.processAnswer(isCorrect, feedback, userAnswer, question);
        } finally {
            // 隐藏loading状态
            this.uiManager.hideLoading();
        }
    }
    
    gradeAnswerTraditional(question, userAnswer) {
        const correctAnswers = Array.isArray(question.english) ? question.english : [question.english];
        const normalizedUserAnswer = this.normalizeAnswer(userAnswer);
        
        return correctAnswers.some(answer => 
            this.normalizeAnswer(answer) === normalizedUserAnswer
        );
    }
    
    normalizeAnswer(answer) {
        return answer.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            // 忽略单复数变化：移除常见的复数后缀，但保留词根
            .replace(/s\b/g, '');
    }
    
    processAnswer(isCorrect, feedback, userAnswer, question) {
        // 始终获取正确答案用于显示
        const correctAnswer = Array.isArray(question.english)
            ? question.english[0]
            : question.english;

        if (isCorrect) {
            this.sessionStats.correct++;

            // 确保正确答案始终显示
            let message = feedback;
            if (!message || !message.includes(correctAnswer)) {
                message = `对: ${correctAnswer}`;
            }

            this.uiManager.showResult(true, message);

            // 如果设置了自动进入下一题
            const settings = this.settingsManager.getSettings();
            if (settings.autoNext) {
                // 清除之前的自动下一题定时器
                if (this.autoNextTimer) {
                    clearTimeout(this.autoNextTimer);
                }
                this.autoNextTimer = setTimeout(() => {
                    this.nextQuestion();
                }, 1500);
                return;
            }
        } else {
            this.sessionStats.wrong++;

            this.sessionStats.wrongAnswers.push({
                chinese: question.chinese,
                correct: correctAnswer,
                userAnswer: userAnswer,
                unit: this.currentUnit
            });

            // 确保错误时也显示正确答案
            let message = feedback;
            if (!message || !message.includes(correctAnswer)) {
                message = `错: 正确答案是${correctAnswer}`;
            }

            this.uiManager.showResult(false, message);
        }

        // 保存统计数据和学习进度
        const questionData = {
            chinese: question.chinese,
            english: correctAnswer,
            userAnswer: userAnswer
        };
        this.statsManager.updateStats(this.currentGrade, this.currentUnit, isCorrect, questionData);
        this.saveLearningProgress();
        this.updateNotebookBadge(); // 更新错题本徽章
    }
    
    skipQuestion() {
        // 清除自动下一题定时器
        if (this.autoNextTimer) {
            clearTimeout(this.autoNextTimer);
            this.autoNextTimer = null;
        }

        if (this.currentQuestionIndex < this.currentQuestions.length) {
            const question = this.currentQuestions[this.currentQuestionIndex];
            // 记录为跳过（不算对也不算错，但计入错题以便复习）
            this.sessionStats.wrong++;
            const correctAnswer = Array.isArray(question.english)
                ? question.english[0]
                : question.english;
            this.sessionStats.wrongAnswers.push({
                chinese: question.chinese,
                correct: correctAnswer,
                userAnswer: '(已跳过)',
                unit: this.currentUnit
            });
            this.statsManager.updateStats(
                this.currentGrade, this.currentUnit, false,
                { chinese: question.chinese, english: correctAnswer, userAnswer: '(已跳过)' }
            );
        }

        this.currentQuestionIndex++;
        this.saveLearningProgress();
        this.displayCurrentQuestion();
    }

    prevQuestion() {
        // 清除自动下一题定时器
        if (this.autoNextTimer) {
            clearTimeout(this.autoNextTimer);
            this.autoNextTimer = null;
        }

        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.saveLearningProgress();
            this.displayCurrentQuestion();
        }
    }

    nextQuestion() {
        // 清除自动下一题定时器，避免重复调用
        if (this.autoNextTimer) {
            clearTimeout(this.autoNextTimer);
            this.autoNextTimer = null;
        }

        this.currentQuestionIndex++;
        this.saveLearningProgress();
        this.displayCurrentQuestion();
    }
    
    showStats() {
        this.currentPage = 'stats-page';
        const accuracy = this.sessionStats.total > 0
            ? Math.round((this.sessionStats.correct / this.sessionStats.total) * 100)
            : 0;

        this.uiManager.showStats({
            total: this.sessionStats.total,
            correct: this.sessionStats.correct,
            accuracy: accuracy,
            wrongAnswers: this.sessionStats.wrongAnswers
        });
        this.saveLearningProgress();
        window.EnglishReview?.accountStorage?.saveRemoteData?.();
    }
    
    retryWrongAnswers() {
        if (this.sessionStats.wrongAnswers.length === 0) {
            this.uiManager.showMessage('没有错题需要重做', 'info');
            return;
        }
        
        // 将错题转换为问题格式
        this.currentQuestions = this.sessionStats.wrongAnswers.map(wrong => ({
            chinese: wrong.chinese,
            english: wrong.correct
        }));
        
        this.currentQuestionIndex = 0;
        this.sessionStats = {
            total: this.currentQuestions.length,
            correct: 0,
            wrong: 0,
            wrongAnswers: []
        };
        
        this.showStudyPage();
        this.displayCurrentQuestion();
    }
    
    showSettings() {
        this.currentPage = 'settings-page';
        const settings = this.settingsManager.getSettings();
        this.uiManager.showSettings(settings);
        this.saveLearningProgress();
        window.EnglishReview?.accountStorage?.saveRemoteData?.();
    }
    
    saveSettings() {
        const settings = this.uiManager.getSettingsFromForm();
        this.settingsManager.saveSettings(settings);
        this.uiManager.showMessage('设置已保存', 'success');

        // 更新AI判题器的设置
        this.aiGrader.updateSettings(settings);

        setTimeout(() => {
            this.goBack();
        }, 1000);
    }

    /**
     * 显示错题本
     */
    showNotebook() {
        this.currentPage = 'notebook-page';
        
        // 显示所有错题（包括已掌握的），已掌握的会通过样式看起来淡一点
        const allWrongAnswers = this.statsManager.getWrongAnswers(null, null, false);
        // 统计信息显示所有错题（包括已掌握的）
        const stats = this.statsManager.getWrongAnswersStats();

        this.uiManager.showNotebook(allWrongAnswers, stats);
        this.updateNotebookBadge(); // 更新徽章
        this.saveLearningProgress();
        window.EnglishReview?.accountStorage?.saveRemoteData?.();
    }
    
    /**
     * 更新错题本徽章（显示是否有未掌握的错题）
     */
    updateNotebookBadge() {
        const notebookBtn = document.getElementById('notebook-btn');
        if (!notebookBtn) return;
        
        const stats = this.statsManager.getWrongAnswersStats();
        if (stats.unmastered > 0) {
            notebookBtn.classList.add('has-errors');
        } else {
            notebookBtn.classList.remove('has-errors');
        }
    }

    /**
     * 导出错题本
     */
    exportNotebook() {
        const success = this.statsManager.exportWrongAnswers();
        if (success) {
            this.uiManager.showMessage('错题本导出成功', 'success');
        } else {
            this.uiManager.showMessage('错题本是空的，无法导出', 'warning');
        }
    }

    /**
     * 清空错题本
     */
    clearNotebook() {
        this.uiManager.showConfirm(
            '确定要清空错题本吗？此操作不可撤销。',
            () => {
                this.statsManager.clearAllWrongAnswers();
                this.uiManager.showMessage('错题本已清空', 'success');
                // 刷新错题本页面
                setTimeout(() => {
                    this.showNotebook();
                }, 500);
                this.updateNotebookBadge(); // 更新徽章
            }
        );
    }

    /**
     * 标记错题为已掌握
     */
    markWrongAnswerAsMastered(wrongAnswerId) {
        this.statsManager.markWrongAnswerMastered(wrongAnswerId);
        this.uiManager.showMessage('已标记为已掌握', 'success');
        // 刷新错题本页面
        setTimeout(() => {
            this.showNotebook();
        }, 300);
        this.updateNotebookBadge(); // 更新徽章
    }

    /**
     * 删除错题
     */
    removeWrongAnswer(wrongAnswerId) {
        this.uiManager.showConfirm(
            '确定要删除这个错题吗？',
            () => {
                // 确保ID类型匹配（转换为数字）
                const id = typeof wrongAnswerId === 'string' ? parseFloat(wrongAnswerId) : wrongAnswerId;
                this.statsManager.removeWrongAnswer(id);
                this.uiManager.showMessage('错题已删除', 'success');
                // 刷新错题本页面
                setTimeout(() => {
                    this.showNotebook();
                }, 300);
                this.updateNotebookBadge(); // 更新徽章
            }
        );
    }
    
    loadSettings() {
        const settings = this.settingsManager.getSettings();
        this.aiGrader.updateSettings(settings);
    }
    
    /**
     * 保存学习进度到本地存储
     * 为每个unit单独保存进度
     */
    saveLearningProgress() {
        try {
            // 总是保存当前状态，即使没有选定单元
            const progressData = {
                currentGrade: this.currentGrade,
                currentSemester: this.currentSemester,
                currentUnit: this.currentUnit,
                studyMode: this.studyMode,
                currentQuestionIndex: this.currentQuestionIndex || 0,
                // 如果没有currentQuestions，使用0或之前的total
                totalQuestions: (this.currentQuestions && this.currentQuestions.length) || 0,
                sessionStats: this.sessionStats,
                currentPage: this.currentPage,
                timestamp: Date.now(),
                isCompleted: this.currentQuestions && this.currentQuestions.length > 0 && this.currentQuestionIndex >= this.currentQuestions.length
            };
            
            // 保存当前主进度（用于恢复会话）
            localStorage.setItem('english_review_progress', JSON.stringify(progressData));

            // 仅当有完整单元信息时，才更新单元历史记录
            if (this.currentGrade && this.currentUnit) {
                const unitKey = this.getProgressKey(this.currentGrade, this.currentUnit, this.studyMode);
                const allProgress = this.getAllUnitProgress();
                
                // 确保不覆盖已有的更好进度（例如已完成状态），除非当前也完成了
                // 这里简单处理：直接更新，因为我们相信当前状态是最新的交互结果
                // 但为了保留isCompleted状态，如果当前未完成但历史已完成，可能需要小心
                // 不过app逻辑中恢复时已考虑了isCompleted
                
                allProgress[unitKey] = progressData;
                localStorage.setItem('english_review_all_progress', JSON.stringify(allProgress));
            }
        } catch (error) {
            console.error('保存学习进度失败:', error);
        }
    }
    
    /**
     * 获取所有unit的进度
     */
    getAllUnitProgress() {
        try {
            const saved = localStorage.getItem('english_review_all_progress');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('获取所有unit进度失败:', error);
            return {};
        }
    }
    
    /**
     * 迁移八年级进度：将原本在8-Down下的单元进度迁移到8-Up，并标记为已完成
     */
    migrateGrade8Progress() {
        try {
            // 检查是否已经执行过迁移
            const migrationFlag = localStorage.getItem('grade8_migration_completed');
            if (migrationFlag === 'true') {
                return; // 已经迁移过，直接返回
            }
            
            const allProgress = this.getAllUnitProgress();
            let hasChanges = false;
            
            // 需要迁移的单元列表（除了U4-speaking）
            const unitsToMigrate = [
                'U1-reading',
                'U1-speaking',
                'U1-viewing-listening',
                'U2-reading',
                'U2-viewing-listening',
                'U3-reading',
                'U3-speaking',
                'U3-viewing-listening'
            ];
            
            unitsToMigrate.forEach(unit => {
                const oldKey = `8-Down/${unit}`;
                const newKey = `8-Up/${unit}`;
                
                // 如果新键已存在，跳过
                if (allProgress[newKey]) {
                    return;
                }
                
                // 如果旧键存在，迁移数据并标记为已完成
                if (allProgress[oldKey]) {
                    // 复制进度数据并标记为已完成
                    const oldProgress = allProgress[oldKey];
                    allProgress[newKey] = {
                        ...oldProgress,
                        currentGrade: '8',
                        currentSemester: 'Up',
                        currentUnit: unit,
                        isCompleted: true,
                        // 确保currentQuestionIndex等于totalQuestions，表示已完成
                        currentQuestionIndex: oldProgress.totalQuestions || oldProgress.currentQuestionIndex || 0,
                        timestamp: Date.now()
                    };
                    hasChanges = true;
                    console.log(`已迁移单元进度: ${oldKey} -> ${newKey} (标记为已完成)`);
                } else {
                    // 如果旧键不存在，创建新的已完成进度
                    // 使用默认值，实际题目数量会在用户查看时自动更新
                    allProgress[newKey] = {
                        currentGrade: '8',
                        currentSemester: 'Up',
                        currentUnit: unit,
                        currentQuestionIndex: 0,
                        totalQuestions: 0,
                        sessionStats: {
                            total: 0,
                            correct: 0,
                            wrong: 0,
                            wrongAnswers: []
                        },
                        currentPage: 'question',
                        timestamp: Date.now(),
                        isCompleted: true
                    };
                    hasChanges = true;
                    console.log(`已创建新单元进度: ${newKey} (标记为已完成)`);
                }
            });
            
            // 如果有更改，保存进度并标记迁移完成
            if (hasChanges) {
                localStorage.setItem('english_review_all_progress', JSON.stringify(allProgress));
                localStorage.setItem('grade8_migration_completed', 'true');
                console.log('八年级进度迁移完成');
            } else {
                // 即使没有更改，也标记迁移完成，避免重复检查
                localStorage.setItem('grade8_migration_completed', 'true');
            }
        } catch (error) {
            console.error('迁移八年级进度失败:', error);
        }
    }
    
    /**
     * 获取指定unit的进度
     */
    getUnitProgress(grade, unit) {
        const unitKey = this.getProgressKey(grade, unit, this.studyMode);
        const allProgress = this.getAllUnitProgress();
        const progress = allProgress[unitKey] || null;
        console.log(`获取进度 - Key: ${unitKey}, 找到进度:`, progress ? '是' : '否');
        return progress;
    }
    
    /**
     * 判断unit是否已完成
     */
    getProgressKey(grade, unit, mode = 'normal') {
        return `${grade}-${unit}::${mode}`;
    }

    isUnitCompleted(grade, unit) {
        const progress = this.getUnitProgress(grade, unit);
        return progress && progress.isCompleted === true;
    }
    
    /**
     * 获取unit的完成进度百分比
     */
    getUnitProgressPercent(grade, unit) {
        const progress = this.getUnitProgress(grade, unit);
        if (!progress || !progress.totalQuestions) return 0;
        
        if (progress.isCompleted) return 100;
        
        const completed = progress.currentQuestionIndex || 0;
        return Math.round((completed / progress.totalQuestions) * 100);
    }

    /**
     * 恢复学习进度
     */
    async restoreLearningProgress() {
        try {
            const saved = localStorage.getItem('english_review_progress');
            if (saved) {
                const progressData = JSON.parse(saved);

                // 检查数据是否过期（超过24小时）- 已移除限制
                const now = Date.now();
                // const hoursDiff = (now - progressData.timestamp) / (1000 * 60 * 60);
                
                // 自动恢复学习进度
                await this.continueLearningProgress(progressData);
            } else {
                this.showGradeSelection();
            }
        } catch (error) {
            console.error('恢复学习进度失败:', error);
            this.clearLearningProgress();
            this.showGradeSelection();
        }
    }
    
    /**
     * 继续学习进度
     */
    async continueLearningProgress(progressData) {
        // 恢复基本状态
        this.currentGrade = progressData.currentGrade || null;
        this.currentSemester = progressData.currentSemester || null; // 恢复选中的学期
        this.currentUnit = progressData.currentUnit || null;
        this.studyMode = progressData.studyMode || 'normal';
        this.currentQuestionIndex = progressData.currentQuestionIndex || 0;
        this.sessionStats = progressData.sessionStats || {
            total: 0,
            correct: 0,
            wrong: 0,
            wrongAnswers: []
        };
        this.currentPage = progressData.currentPage || 'grade-selection';

        if (this.currentGrade && this.currentUnit) {
            try {
                if (this.studyMode === 'transform') {
                    this.currentQuestions = await this.getTransformQuestionsForUnit(this.currentGrade, this.currentUnit);
                } else {
                    this.currentQuestions = await this.dataManager.getQuestionsForUnit(this.currentGrade, this.currentUnit);
                }
            } catch (error) {
                console.error('恢复单元题目失败:', error);
                this.currentQuestions = [];
            }
        } else {
            this.currentQuestions = [];
        }

        if (!Array.isArray(this.currentQuestions)) {
            this.currentQuestions = [];
        }

        const requiresQuestions = ['study-page', 'stats-page'].includes(this.currentPage);
        if (requiresQuestions && this.currentQuestions.length === 0) {
            this.uiManager.showMessage('无法恢复该单元的题目，请重新选择', 'warning');
            this.showGradeSelection();
            return;
        }

        if (this.currentQuestions.length > 0) {
            this.sessionStats = {
                ...this.sessionStats,
                total: this.currentQuestions.length,
                correct: this.sessionStats.correct || 0,
                wrong: this.sessionStats.wrong || 0,
                wrongAnswers: this.sessionStats.wrongAnswers || []
            };

            if (this.currentQuestionIndex > this.currentQuestions.length) {
                this.currentQuestionIndex = this.currentQuestions.length;
            }
        }

        // 根据当前页面恢复界面
        switch (this.currentPage) {
            case 'grade-selection':
                this.showGradeSelection();
                break;
            case 'unit-selection':
                this.showUnitSelection().catch(err => {
                    console.error('显示单元选择页面失败:', err);
                    this.uiManager.showMessage('加载单元列表失败', 'error');
                });
                break;
            case 'study-page':
                this.showStudyPage();
                this.displayCurrentQuestion();
                this.uiManager.showMessage('已恢复之前的默写进度', 'success');
                break;
            case 'stats-page':
                this.showStats();
                break;
            case 'settings-page':
                this.showSettings();
                break;
            default:
                this.showGradeSelection();
        }

        console.log('学习进度已恢复');
    }
    
    /**
     * 清除学习进度
     */
    clearLearningProgress() {
        localStorage.removeItem('english_review_progress');
        this.currentGrade = null;
        this.currentSemester = null;
        this.currentUnit = null;
        this.studyMode = 'normal';
        this.currentQuestionIndex = 0;
        this.currentQuestions = [];
        this.sessionStats = null;
        this.currentPage = 'grade-selection';
    }
    
    /**
     * 重新开始当前会话
     */
    restartCurrentSession() {
        if (!this.currentGrade || !this.currentUnit || !this.currentQuestions || this.currentQuestions.length === 0) {
            this.uiManager.showMessage('没有可重新开始的会话', 'warning');
            return;
        }
        
        this.uiManager.showConfirm(
            `确定要重新开始吗？\n当前进度：${this.currentQuestionIndex + 1}/${this.currentQuestions.length} 题\n\n重新开始将清除当前进度并返回年级选择页面，但不会删除已记录的错题。`,
            () => {
                // 清除学习进度并返回年级选择页面
                this.clearLearningProgress();
                this.showGradeSelection();
                this.uiManager.showMessage('已清除进度，请重新选择年级和单元', 'success');
            }
        );
    }
}

// 初始化应用函数
export function initApp() {
    return new EnglishReviewApp();
}

// 启动应用（兼容旧版本）
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
