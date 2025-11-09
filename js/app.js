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
        this.currentUnit = null;
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

        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.restoreLearningProgress(); // 恢复学习进度
    }
    
    setupEventListeners() {
        // 年级选择
        document.querySelectorAll('.grade-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const grade = e.currentTarget.dataset.grade;
                this.selectGrade(grade);
            });
        });
        
        // 返回按钮
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.goBack();
            });
        });
        
        // 设置按钮
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettings();
        });
        
        // 提交答案
        document.getElementById('submit-btn').addEventListener('click', () => {
            this.submitAnswer();
        });
        
        // 下一题
        document.getElementById('next-btn').addEventListener('click', () => {
            this.nextQuestion();
        });
        
        // 输入框回车提交（优化：支持Enter键，禁用时不允许提交）
        const answerInput = document.getElementById('answer-input');
        answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !answerInput.disabled) {
                e.preventDefault();
                this.submitAnswer();
            }
        });
        
        // 输入框获得焦点时自动选中文本（方便快速输入）
        answerInput.addEventListener('focus', (e) => {
            e.target.select();
        });
        
        // 重做错题
        document.getElementById('retry-wrong-btn').addEventListener('click', () => {
            this.retryWrongAnswers();
        });
        
        // 保存设置
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        // 错题本按钮
        document.getElementById('view-notebook-btn').addEventListener('click', () => {
            this.showNotebook();
        });

        // 导出错题本
        document.getElementById('export-notebook-btn').addEventListener('click', () => {
            this.exportNotebook();
        });

        // 清空错题本
        document.getElementById('clear-notebook-btn').addEventListener('click', () => {
            this.clearNotebook();
        });
    }
    
    selectGrade(grade) {
        this.currentGrade = grade;
        this.currentUnit = null;
        this.currentQuestionIndex = 0;
        this.currentQuestions = [];
        this.sessionStats = {
            total: 0,
            correct: 0,
            wrong: 0,
            wrongAnswers: []
        };
        this.showUnitSelection();
    }
    
    showGradeSelection() {
        this.currentPage = 'grade-selection';
        this.uiManager.showPage('grade-selection');
        this.saveLearningProgress();
    }

    showUnitSelection() {
        this.currentPage = 'unit-selection';
        const units = this.dataManager.getUnitsForGrade(this.currentGrade);
        this.uiManager.showUnitSelection(this.currentGrade, units, (unit) => {
            this.selectUnit(unit);
        });
        this.saveLearningProgress();
    }
    
    async selectUnit(unit) {
        this.currentUnit = unit;

        // 异步加载题目数据
        this.currentQuestions = await this.dataManager.getQuestionsForUnit(this.currentGrade, unit);
        this.currentQuestionIndex = 0;
        this.sessionStats = {
            total: this.currentQuestions.length,
            correct: 0,
            wrong: 0,
            wrongAnswers: []
        };

        this.showStudyPage();
        this.displayCurrentQuestion();
        this.saveLearningProgress();
    }
    
    showStudyPage() {
        this.currentPage = 'study-page';
        this.uiManager.showPage('study-page');
        this.saveLearningProgress();
    }
    
    displayCurrentQuestion() {
        if (this.currentQuestionIndex >= this.currentQuestions.length) {
            this.showStats();
            return;
        }
        
        const question = this.currentQuestions[this.currentQuestionIndex];
        const progress = {
            current: this.currentQuestionIndex + 1,
            total: this.currentQuestions.length,
            percentage: ((this.currentQuestionIndex + 1) / this.currentQuestions.length) * 100
        };
        
        // 使用requestAnimationFrame确保流畅的UI更新
        requestAnimationFrame(() => {
            this.uiManager.displayQuestion(question, progress);
            this.uiManager.hideResult();
            
            // 延迟聚焦，确保输入框已启用
            setTimeout(() => {
                this.uiManager.focusInput();
            }, 100);
        });
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
            if (settings.enableAIGrading && settings.apiKey) {
                // 使用AI判题
                try {
                    const result = await this.aiGrader.gradeAnswer(question, userAnswer, settings);
                    isCorrect = result.isCorrect;
                    feedback = result.feedback;
                } catch (error) {
                    console.error('AI判题失败，使用传统判题:', error);
                    isCorrect = this.gradeAnswerTraditional(question, userAnswer);
                }
            } else {
                // 传统判题
                isCorrect = this.gradeAnswerTraditional(question, userAnswer);
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
        this.statsManager.updateStats(this.currentGrade, this.currentUnit, isCorrect);
        this.saveLearningProgress();
    }
    
    nextQuestion() {
        // 清除自动下一题定时器，避免重复调用
        if (this.autoNextTimer) {
            clearTimeout(this.autoNextTimer);
            this.autoNextTimer = null;
        }

        this.currentQuestionIndex++;
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
        const allWrongAnswers = this.statsManager.getAllWrongAnswers();
        const stats = this.statsManager.getWrongAnswersStats();

        this.uiManager.showNotebook(allWrongAnswers, stats);
    }

    /**
     * 导出错题本
     */
    exportNotebook() {
        const allWrongAnswers = this.statsManager.getAllWrongAnswers();
        if (allWrongAnswers.length === 0) {
            this.uiManager.showMessage('错题本是空的，无法导出', 'warning');
            return;
        }

        // 使用现有的导出功能
        this.statsManager.exportWrongAnswers();
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
            }
        );
    }

    /**
     * 标记错题为已掌握
     */
    markWrongAnswerAsMastered(wrongAnswerId) {
        this.statsManager.markWrongAnswerAsMastered(wrongAnswerId);
        this.uiManager.showMessage('已标记为已掌握', 'success');
        // 刷新错题本页面
        setTimeout(() => {
            this.showNotebook();
        }, 300);
    }

    /**
     * 删除错题
     */
    removeWrongAnswer(wrongAnswerId) {
        this.uiManager.showConfirm(
            '确定要删除这个错题吗？',
            () => {
                this.statsManager.removeWrongAnswer(wrongAnswerId);
                this.uiManager.showMessage('错题已删除', 'success');
                // 刷新错题本页面
                setTimeout(() => {
                    this.showNotebook();
                }, 300);
            }
        );
    }
    
    loadSettings() {
        const settings = this.settingsManager.getSettings();
        this.aiGrader.updateSettings(settings);
    }
    
    /**
     * 保存学习进度到本地存储
     */
    saveLearningProgress() {
        try {
            const progressData = {
                currentGrade: this.currentGrade,
                currentUnit: this.currentUnit,
                currentQuestionIndex: this.currentQuestionIndex,
                currentQuestions: this.currentQuestions,
                sessionStats: this.sessionStats,
                currentPage: this.currentPage,
                timestamp: Date.now()
            };
            localStorage.setItem('english_review_progress', JSON.stringify(progressData));
        } catch (error) {
            console.error('保存学习进度失败:', error);
        }
    }

    /**
     * 恢复学习进度
     */
    restoreLearningProgress() {
        try {
            const saved = localStorage.getItem('english_review_progress');
            if (saved) {
                const progressData = JSON.parse(saved);

                // 检查数据是否过期（超过24小时）
                const now = Date.now();
                const hoursDiff = (now - progressData.timestamp) / (1000 * 60 * 60);
                if (hoursDiff > 24) {
                    console.log('学习进度已过期，重新开始');
                    this.showGradeSelection();
                    return;
                }

                // 恢复基本状态
                this.currentGrade = progressData.currentGrade;
                this.currentUnit = progressData.currentUnit;
                this.currentQuestionIndex = progressData.currentQuestionIndex;
                this.currentQuestions = progressData.currentQuestions;
                this.sessionStats = progressData.sessionStats;
                this.currentPage = progressData.currentPage;

                // 根据当前页面恢复界面
                switch (this.currentPage) {
                    case 'grade-selection':
                        this.showGradeSelection();
                        break;
                    case 'unit-selection':
                        this.showUnitSelection();
                        break;
                    case 'study-page':
                        this.showStudyPage();
                        this.displayCurrentQuestion();
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
            } else {
                this.showGradeSelection();
            }
        } catch (error) {
            console.error('恢复学习进度失败:', error);
            this.showGradeSelection();
        }
    }

    goBack() {
        const currentPage = document.querySelector('.page.active').id;

        switch (currentPage) {
            case 'unit-selection':
                this.showGradeSelection();
                break;
            case 'study-page':
                this.showUnitSelection();
                break;
            case 'stats-page':
                this.showUnitSelection();
                break;
            case 'notebook-page':
                this.showStats();
                break;
            case 'settings-page':
                this.showGradeSelection();
                break;
            default:
                this.showGradeSelection();
        }
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