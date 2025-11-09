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
        this.updateNotebookBadge(); // 更新错题本徽章
    }
    
    setupEventListeners() {
        // 年级和学期选择（新设计）
        document.querySelectorAll('.semester-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gradeItem = e.currentTarget.closest('.grade-item');
                const grade = gradeItem.dataset.grade;
                const semester = e.currentTarget.dataset.semester;
                
                // 更新UI状态
                document.querySelectorAll('.grade-item').forEach(item => {
                    item.classList.remove('active');
                });
                document.querySelectorAll('.semester-btn').forEach(b => {
                    b.classList.remove('active');
                });
                
                gradeItem.classList.add('active');
                e.currentTarget.classList.add('active');
                
                // 保存当前选中的年级和学期
                this.currentGrade = grade;
                this.currentSemester = semester;
                this.saveLearningProgress();
                
                // 显示预览（异步）
                this.showUnitPreview(grade, semester).catch(err => {
                    console.error('显示单元预览失败:', err);
                    this.uiManager.showMessage('加载单元列表失败', 'error');
                });
            });
        });
        
        // 单元预览卡片点击 - 直接进入学习，跳过单元选择页面
        document.addEventListener('click', (e) => {
            if (e.target.closest('.preview-unit-card')) {
                const card = e.target.closest('.preview-unit-card');
                const unit = card.dataset.unit;
                const grade = card.dataset.grade;
                if (unit && grade) {
                    // 直接选择单元，跳过单元选择页面
                    this.currentGrade = grade;
                    this.selectUnit(unit);
                }
            }
        });
        
        // 返回按钮
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.goBack();
            });
        });
        
        // 错题本按钮（主页）
        document.getElementById('notebook-btn').addEventListener('click', () => {
            this.showNotebook();
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
        
        // 重新开始按钮
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartCurrentSession();
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
        this.showUnitSelection().catch(err => {
            console.error('显示单元选择页面失败:', err);
            this.uiManager.showMessage('加载单元列表失败', 'error');
        });
    }
    
    /**
     * 显示单元预览（异步，等待单元列表加载）
     */
    async showUnitPreview(grade, semester) {
        // 更新预览标题
        const gradeName = grade === '7' ? '七年级' : '八年级';
        const semesterName = semester === 'Up' ? '上册' : '下册';
        document.getElementById('preview-title').textContent = `${gradeName}${semesterName}`;
        
        // 更新预览内容（显示加载中）
        const previewContainer = document.getElementById('unit-preview');
        previewContainer.innerHTML = `
            <div class="preview-placeholder">
                <p>加载中...</p>
            </div>
        `;
        
        // 确保单元列表已加载
        let units = this.dataManager.getUnitsForGrade(grade);
        if (!units || Object.keys(units).length === 0) {
            // 如果单元列表为空，尝试重新加载
            await this.dataManager.scanUnitFiles();
            units = this.dataManager.getUnitsForGrade(grade);
        }
        
        const semesterUnits = units[semester] || [];
        
        // 清空预览容器
        previewContainer.innerHTML = '';
        
        if (semesterUnits.length === 0) {
            previewContainer.innerHTML = `
                <div class="preview-placeholder">
                    <p>该学期暂无可用单元</p>
                </div>
            `;
            return;
        }
        
        semesterUnits.forEach(unit => {
            const fullUnit = `${semester}/${unit}`;
            const card = document.createElement('div');
            card.className = 'preview-unit-card';
            card.dataset.grade = grade;
            card.dataset.unit = fullUnit;
            
            // 获取单元完成状态
            const isCompleted = this.isUnitCompleted(grade, fullUnit);
            const progressPercent = this.getUnitProgressPercent(grade, fullUnit);
            
            let statusText = '点击开始学习';
            if (isCompleted) {
                statusText = '✓ 已完成';
                card.classList.add('preview-unit-completed');
            } else if (progressPercent > 0) {
                statusText = `进度: ${progressPercent}%`;
                card.classList.add('preview-unit-in-progress');
            }
            
            card.innerHTML = `
                <h3>${unit}</h3>
                <p class="preview-unit-status">${statusText}</p>
                ${progressPercent > 0 && !isCompleted ? `
                    <div class="preview-unit-progress-bar">
                        <div class="preview-unit-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                ` : ''}
            `;
            previewContainer.appendChild(card);
        });
    }
    
    showGradeSelection() {
        this.currentPage = 'grade-selection';
        this.uiManager.showPage('grade-selection');
        
        // 重置预览状态（但不重置侧边栏选中状态，因为可能正在恢复）
        document.getElementById('preview-title').textContent = '请选择年级和学期';
        document.getElementById('unit-preview').innerHTML = `
            <div class="preview-placeholder">
                <p>选择左侧的年级和学期，查看可用的单元</p>
            </div>
        `;
        
        // 更新侧边栏显示单元完成状态
        this.updateSidebarUnitStatus().catch(err => {
            console.error('更新侧边栏状态失败:', err);
        });
        
        this.saveLearningProgress();
    }
    
    /**
     * 恢复侧边栏的选中状态
     */
    restoreSidebarSelection() {
        if (!this.currentGrade || !this.currentSemester) {
            return;
        }
        
        // 恢复年级选中状态
        const gradeItem = document.querySelector(`.grade-item[data-grade="${this.currentGrade}"]`);
        if (gradeItem) {
            document.querySelectorAll('.grade-item').forEach(item => {
                item.classList.remove('active');
            });
            gradeItem.classList.add('active');
            
            // 恢复学期选中状态
            const semesterBtn = gradeItem.querySelector(`.semester-btn[data-semester="${this.currentSemester}"]`);
            if (semesterBtn) {
                document.querySelectorAll('.semester-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                semesterBtn.classList.add('active');
                
                // 显示预览
                this.showUnitPreview(this.currentGrade, this.currentSemester).catch(err => {
                    console.error('显示单元预览失败:', err);
                });
            }
        }
    }
    
    /**
     * 更新侧边栏中每个单元的完成状态显示
     */
    async updateSidebarUnitStatus() {
        // 确保单元列表已加载
        await this.dataManager.scanUnitFiles();
        
        // 遍历所有年级
        document.querySelectorAll('.grade-item').forEach(gradeItem => {
            const grade = gradeItem.dataset.grade;
            const units = this.dataManager.getUnitsForGrade(grade);
            
            // 清除之前的状态类
            gradeItem.classList.remove('grade-completed', 'grade-in-progress');
            
            if (!units || Object.keys(units).length === 0) {
                return;
            }
            
            // 计算该年级所有单元的完成情况
            let totalUnits = 0;
            let completedUnits = 0;
            let inProgressUnits = 0;
            
            Object.keys(units).forEach(semester => {
                units[semester].forEach(unit => {
                    const fullUnit = `${semester}/${unit}`;
                    totalUnits++;
                    if (this.isUnitCompleted(grade, fullUnit)) {
                        completedUnits++;
                    } else if (this.getUnitProgressPercent(grade, fullUnit) > 0) {
                        inProgressUnits++;
                    }
                });
            });
            
            // 更新年级项的显示
            const gradeName = gradeItem.querySelector('.grade-name');
            if (gradeName && totalUnits > 0) {
                const progressText = completedUnits > 0 || inProgressUnits > 0 
                    ? ` (${completedUnits}/${totalUnits} 已完成)`
                    : '';
                const gradeText = grade === '7' ? '七年级' : '八年级';
                gradeName.innerHTML = `${gradeText}${progressText}`;
                
                // 添加完成状态类
                if (completedUnits === totalUnits) {
                    gradeItem.classList.add('grade-completed');
                } else if (completedUnits > 0 || inProgressUnits > 0) {
                    gradeItem.classList.add('grade-in-progress');
                }
            }
        });
        
        // 如果当前有选中的年级和学期，更新预览区域
        if (this.currentGrade && this.currentSemester) {
            await this.showUnitPreview(this.currentGrade, this.currentSemester);
        }
    }

    async showUnitSelection() {
        this.currentPage = 'unit-selection';
        
        // 确保单元列表已加载
        let units = this.dataManager.getUnitsForGrade(this.currentGrade);
        if (!units || Object.keys(units).length === 0) {
            // 如果单元列表为空，尝试重新加载
            await this.dataManager.scanUnitFiles();
            units = this.dataManager.getUnitsForGrade(this.currentGrade);
        }
        
        this.uiManager.showUnitSelection(this.currentGrade, units, (unit) => {
            this.selectUnit(unit);
        }, this); // 传递app实例，用于获取进度信息
        this.saveLearningProgress();
    }
    
    async selectUnit(unit) {
        this.currentUnit = unit;

        // 异步加载题目数据
        this.currentQuestions = await this.dataManager.getQuestionsForUnit(this.currentGrade, unit);
        
        // 从unit的独立进度中恢复
        let shouldRestoreProgress = false;
        const progress = this.getUnitProgress(this.currentGrade, unit);
        
        if (progress) {
            // 检查进度是否有效且未过期（24小时内）
            const now = Date.now();
            const hoursDiff = (now - progress.timestamp) / (1000 * 60 * 60);
            
            // 如果已完成，从头开始
            if (progress.isCompleted) {
                this.currentQuestionIndex = 0;
                this.sessionStats = {
                    total: this.currentQuestions.length,
                    correct: 0,
                    wrong: 0,
                    wrongAnswers: []
                };
            } else if (hoursDiff <= 24 && 
                      progress.currentQuestionIndex > 0 && 
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
    }
    
    showStudyPage() {
        this.currentPage = 'study-page';
        this.uiManager.showPage('study-page');
        this.saveLearningProgress();
    }
    
    displayCurrentQuestion() {
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
        const questionData = {
            chinese: question.chinese,
            english: correctAnswer,
            userAnswer: userAnswer
        };
        this.statsManager.updateStats(this.currentGrade, this.currentUnit, isCorrect, questionData);
        this.saveLearningProgress();
        this.updateNotebookBadge(); // 更新错题本徽章
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
        
        // 更新侧边栏状态（如果当前在年级选择页面）
        if (this.currentGrade) {
            this.updateSidebarUnitStatus().catch(err => {
                console.error('更新侧边栏状态失败:', err);
            });
        }
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
        this.updateNotebookBadge(); // 更新徽章
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
            if (!this.currentGrade || !this.currentUnit) {
                return; // 如果没有选择年级和单元，不保存
            }
            
            // 检查 currentQuestions 是否存在
            if (!this.currentQuestions || !Array.isArray(this.currentQuestions)) {
                console.warn('currentQuestions 未初始化，跳过保存进度');
                return;
            }
            
            // 为当前unit保存进度
            const unitKey = `${this.currentGrade}-${this.currentUnit}`;
            const progressData = {
                currentGrade: this.currentGrade,
                currentSemester: this.currentSemester, // 保存当前选中的学期
                currentUnit: this.currentUnit,
                currentQuestionIndex: this.currentQuestionIndex,
                totalQuestions: this.currentQuestions.length,
                sessionStats: this.sessionStats,
                currentPage: this.currentPage,
                timestamp: Date.now(),
                isCompleted: this.currentQuestionIndex >= this.currentQuestions.length
            };
            
            // 获取所有unit的进度
            const allProgress = this.getAllUnitProgress();
            allProgress[unitKey] = progressData;
            
            // 保存所有进度
            localStorage.setItem('english_review_all_progress', JSON.stringify(allProgress));
            
            // 同时保存当前进度（用于快速恢复）
            localStorage.setItem('english_review_progress', JSON.stringify(progressData));
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
     * 获取指定unit的进度
     */
    getUnitProgress(grade, unit) {
        const unitKey = `${grade}-${unit}`;
        const allProgress = this.getAllUnitProgress();
        const progress = allProgress[unitKey] || null;
        console.log(`获取进度 - Key: ${unitKey}, 找到进度:`, progress ? '是' : '否');
        return progress;
    }
    
    /**
     * 判断unit是否已完成
     */
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
                    localStorage.removeItem('english_review_progress');
                    this.showGradeSelection();
                    return;
                }

                // 自动恢复学习进度
                this.continueLearningProgress(progressData);
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
    continueLearningProgress(progressData) {
        // 恢复基本状态
        this.currentGrade = progressData.currentGrade;
        this.currentSemester = progressData.currentSemester || null; // 恢复选中的学期
        this.currentUnit = progressData.currentUnit;
        this.currentQuestionIndex = progressData.currentQuestionIndex;
        this.currentQuestions = progressData.currentQuestions;
        this.sessionStats = progressData.sessionStats;
        this.currentPage = progressData.currentPage;

        // 根据当前页面恢复界面
        switch (this.currentPage) {
            case 'grade-selection':
                this.showGradeSelection();
                // 恢复侧边栏的选中状态
                this.restoreSidebarSelection();
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
        this.currentUnit = null;
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

    goBack() {
        const currentPage = document.querySelector('.page.active').id;

        switch (currentPage) {
            case 'unit-selection':
                this.showGradeSelection();
                break;
            case 'study-page':
                // 直接返回年级选择页面，跳过单元选择页面
                this.showGradeSelection();
                break;
            case 'stats-page':
                // 从统计页面返回时，也返回到年级选择页面
                this.showGradeSelection();
                break;
            case 'notebook-page':
                // 从错题本返回时，返回到年级选择页面
                this.showGradeSelection();
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