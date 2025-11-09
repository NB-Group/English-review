/**
 * UI管理器
 * 负责界面显示和交互
 */

export class UIManager {
    constructor() {
        this.currentPage = 'grade-selection';
        this.messageTimeout = null;
    }
    
    /**
     * 显示指定页面 - 流畅的页面切换
     */
    showPage(pageId) {
        const targetPage = document.getElementById(pageId);
        if (!targetPage) return;
        
        // 获取当前活动页面
        const currentPage = document.querySelector('.page.active');
        
        // 如果切换到同一页面，直接返回
        if (currentPage === targetPage) return;
        
        // 先隐藏当前页面
        if (currentPage) {
            currentPage.classList.remove('active');
        }
        
        // 使用 requestAnimationFrame 确保流畅过渡
        requestAnimationFrame(() => {
            targetPage.classList.add('active');
            this.currentPage = pageId;
            
            // 聚焦到主要内容区域（无障碍）
            const mainContent = targetPage.querySelector('.card, .heading');
            if (mainContent) {
                mainContent.setAttribute('tabindex', '-1');
                mainContent.focus();
            }
        });
    }
    
    /**
     * 显示单元选择页面
     */
    showUnitSelection(grade, units, onUnitSelect) {
        document.getElementById('grade-title').textContent = `${grade}年级单元`;

        const unitGrid = document.getElementById('unit-grid');
        unitGrid.innerHTML = '';

        Object.keys(units).forEach(semester => {
            // 添加学期标题
            const semesterTitle = document.createElement('div');
            semesterTitle.className = 'semester-title';
            // 将英文的Up/Down转换为中文显示
            const displaySemester = semester === 'Up' ? '上册' : '下册';
            semesterTitle.innerHTML = `<h3>${displaySemester}</h3>`;
            unitGrid.appendChild(semesterTitle);

            // 添加单元卡片
            units[semester].forEach(unit => {
                const unitCard = document.createElement('button');
                unitCard.className = 'unit-card';
                unitCard.dataset.unit = `${semester}/${unit}`;
                unitCard.innerHTML = `
                    <div class="unit-card-content">
                        <h3>${unit}</h3>
                        <p>点击开始学习</p>
                    </div>
                `;
                unitGrid.appendChild(unitCard);
            });
        });

        // 设置单元选择事件
        document.querySelectorAll('.unit-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const unit = e.currentTarget.dataset.unit;
                if (onUnitSelect) {
                    onUnitSelect(unit);
                }
            });
        });

        this.showPage('unit-selection');
    }
    
    /**
     * 显示问题
     */
    displayQuestion(question, progress) {
        document.getElementById('chinese-text').textContent = question.chinese;
        document.getElementById('current-progress').textContent = `${progress.current}/${progress.total}`;
        document.getElementById('progress-fill').style.width = `${progress.percentage}%`;
        
        // 清空输入框
        this.clearInput();
    }
    
    /**
     * 显示答题结果 - 带流畅动画
     */
    showResult(isCorrect, message) {
        const resultArea = document.getElementById('result-area');
        const resultMessage = document.getElementById('result-message');
        const input = document.getElementById('answer-input');
        const submitBtn = document.getElementById('submit-btn');
        
        // 清除之前的类
        resultArea.classList.remove('hidden', 'correct', 'incorrect');
        
        // 添加结果类
        resultArea.classList.add(isCorrect ? 'correct' : 'incorrect');
        resultMessage.textContent = message;
        
        // 禁用输入和提交按钮
        input.disabled = true;
        submitBtn.disabled = true;
        
        // 显示结果区域（带动画）
        requestAnimationFrame(() => {
            resultArea.classList.remove('hidden');
            resultArea.classList.add('show');
        });
    }
    
    /**
     * 隐藏结果区域 - 带流畅动画
     */
    hideResult() {
        const resultArea = document.getElementById('result-area');
        const input = document.getElementById('answer-input');
        const submitBtn = document.getElementById('submit-btn');
        
        // 先移除show类，触发退出动画
        resultArea.classList.remove('show');
        
        // 等待动画完成后隐藏
        setTimeout(() => {
            resultArea.classList.add('hidden');
            resultArea.classList.remove('correct', 'incorrect');
            
            // 启用输入和提交按钮
            input.disabled = false;
            submitBtn.disabled = false;
        }, 300);
    }

    /**
     * 显示loading状态
     */
    showLoading() {
        const questionArea = document.querySelector('.question-area');
        if (questionArea) {
            questionArea.classList.add('loading');
        }
    }

    /**
     * 隐藏loading状态
     */
    hideLoading() {
        const questionArea = document.querySelector('.question-area');
        if (questionArea) {
            questionArea.classList.remove('loading');
        }
    }
    
    /**
     * 获取用户输入
     */
    getUserInput() {
        return document.getElementById('answer-input').value.trim();
    }
    
    /**
     * 清空输入框
     */
    clearInput() {
        document.getElementById('answer-input').value = '';
    }
    
    /**
     * 聚焦到输入框
     */
    focusInput() {
        document.getElementById('answer-input').focus();
    }
    
    /**
     * 显示统计页面
     */
    showStats(stats) {
        document.getElementById('total-questions').textContent = stats.total;
        document.getElementById('correct-answers').textContent = stats.correct;
        document.getElementById('accuracy-rate').textContent = `${stats.accuracy}%`;

        // 显示错题列表
        const wrongAnswersList = document.getElementById('wrong-answers-list');
        wrongAnswersList.innerHTML = '';

        if (stats.wrongAnswers.length === 0) {
            wrongAnswersList.innerHTML = '<div class="no-wrong-answers">太棒了！没有错题 🎉</div>';
            document.getElementById('retry-wrong-btn').style.display = 'none';
        } else {
            stats.wrongAnswers.forEach(wrong => {
                const item = document.createElement('div');
                item.className = 'wrong-answer-item';
                item.innerHTML = `
                    <div class="wrong-chinese">${wrong.chinese}</div>
                    <div class="wrong-correct">正确答案: ${wrong.correct}</div>
                    <div class="wrong-user">你的答案: ${wrong.userAnswer}</div>
                `;
                wrongAnswersList.appendChild(item);
            });
            document.getElementById('retry-wrong-btn').style.display = 'block';
        }

        this.showPage('stats-page');
    }

    /**
     * 显示错题本页面
     */
    showNotebook(allWrongAnswers, stats) {
        // 更新统计信息
        document.getElementById('notebook-total').textContent = stats.total;
        document.getElementById('notebook-mastered').textContent = stats.mastered;

        const notebookContent = document.getElementById('notebook-content');
        notebookContent.innerHTML = '';

        if (allWrongAnswers.length === 0) {
            notebookContent.innerHTML = `
                <div class="notebook-empty">
                    <div class="notebook-empty-icon">📚</div>
                    <h3>错题本是空的</h3>
                    <p>还没有记录任何错题，继续学习吧！</p>
                </div>
            `;
        } else {
            // 按时间倒序排列
            const sortedWrongAnswers = allWrongAnswers.sort((a, b) => b.timestamp - a.timestamp);

            sortedWrongAnswers.forEach((wrong, index) => {
                const item = document.createElement('div');
                item.className = 'notebook-item';

                const date = new Date(wrong.timestamp).toLocaleDateString('zh-CN');
                const time = new Date(wrong.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                item.innerHTML = `
                    <div class="notebook-item-header">
                        <div class="notebook-item-title">${wrong.chinese}</div>
                        <div class="notebook-item-meta">
                            <span>${date} ${time}</span>
                            <span>${wrong.grade}年级 · ${wrong.unit}</span>
                            ${wrong.mastered ? '<span class="mastered">已掌握</span>' : '<span class="unmastered">待复习</span>'}
                        </div>
                    </div>
                    <div class="notebook-item-content">
                        <div class="notebook-item-question">
                            <div class="chinese">${wrong.chinese}</div>
                            <div class="correct">✓ ${wrong.correct}</div>
                            <div class="user">✗ ${wrong.userAnswer}</div>
                        </div>
                    </div>
                    <div class="notebook-item-actions">
                        <button class="notebook-item-action" onclick="EnglishReview.app.markWrongAnswerAsMastered('${wrong.id}')" title="标记为已掌握">
                            ✅
                        </button>
                        <button class="notebook-item-action" onclick="EnglishReview.app.removeWrongAnswer('${wrong.id}')" title="删除错题">
                            🗑️
                        </button>
                    </div>
                `;

                notebookContent.appendChild(item);
            });
        }

        this.showPage('notebook-page');
    }
    
    /**
     * 显示设置页面
     */
    showSettings(settings) {
        document.getElementById('api-key').value = settings.apiKey || '';
        document.getElementById('ai-model').value = settings.aiModel || 'Qwen/Qwen2.5-7B-Instruct';
        document.getElementById('enable-ai-grading').checked = settings.enableAIGrading || false;
        document.getElementById('auto-next').checked = settings.autoNext !== false; // 默认true
        document.getElementById('show-hints').checked = settings.showHints || false;
        
        this.showPage('settings-page');
    }
    
    /**
     * 从表单获取设置
     */
    getSettingsFromForm() {
        return {
            apiKey: document.getElementById('api-key').value.trim(),
            aiModel: document.getElementById('ai-model').value,
            enableAIGrading: document.getElementById('enable-ai-grading').checked,
            autoNext: document.getElementById('auto-next').checked,
            showHints: document.getElementById('show-hints').checked
        };
    }
    
    /**
     * 显示消息提示
     */
    showMessage(message, type = 'info', duration = 3000) {
        const messageEl = document.getElementById('message');
        
        // 清除之前的定时器
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        // 设置消息内容和类型
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        
        // 显示消息
        messageEl.classList.remove('hidden');
        messageEl.classList.add('show');
        
        // 自动隐藏
        this.messageTimeout = setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                messageEl.classList.add('hidden');
            }, 300);
        }, duration);
    }
    
    /**
     * 添加加载状态
     */
    showLoading(element) {
        if (element) {
            element.classList.add('loading');
            element.disabled = true;
        }
    }
    
    /**
     * 移除加载状态
     */
    hideLoading(element) {
        if (element) {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }
    
    /**
     * 创建确认对话框
     */
    showConfirm(message, onConfirm, onCancel) {
        // 简单实现，可以后续改为自定义模态框
        if (confirm(message)) {
            onConfirm && onConfirm();
        } else {
            onCancel && onCancel();
        }
    }
    
    /**
     * 添加CSS动画类
     */
    addAnimation(element, animationClass, duration = 600) {
        if (!element) return;
        
        element.classList.add(animationClass);
        
        setTimeout(() => {
            element.classList.remove(animationClass);
        }, duration);
    }
    
    /**
     * 平滑滚动到元素
     */
    scrollToElement(element, offset = 0) {
        if (!element) return;
        
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
    
    /**
     * 获取当前页面ID
     */
    getCurrentPage() {
        return this.currentPage;
    }
    
    /**
     * 设置页面标题
     */
    setPageTitle(title) {
        document.title = title ? `${title} - 英语复习助手` : '英语复习助手';
    }
    
    /**
     * 更新进度条
     */
    updateProgress(current, total) {
        const percentage = total > 0 ? (current / total) * 100 : 0;
        document.getElementById('progress-fill').style.width = `${percentage}%`;
        document.getElementById('current-progress').textContent = `${current}/${total}`;
    }
}
