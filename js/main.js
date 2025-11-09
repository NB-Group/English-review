/**
 * 主入口模块
 * 导入并初始化应用
 */

// 立即设置全局对象，确保在模块加载时就可用
window.EnglishReview = {
    app: null, // 将在应用初始化后设置

    // 便捷方法
    nextQuestion() {
        if (this.app) {
            this.app.nextQuestion();
            return '已跳转到下一个单词';
        }
        return '应用尚未初始化';
    },

    showCurrentQuestion() {
        if (this.app) {
            this.app.displayCurrentQuestion();
            return '已刷新当前题目显示';
        }
        return '应用尚未初始化';
    },

    getProgress() {
        if (this.app) {
            const progress = this.app.sessionStats;
            return {
                current: this.app.currentQuestionIndex + 1,
                total: progress.total,
                correct: progress.correct,
                wrong: progress.wrong,
                accuracy: progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : 0
            };
        }
        return '应用尚未初始化';
    },

    getCurrentQuestion() {
        if (this.app && this.app.currentQuestions.length > 0) {
            const current = this.app.currentQuestions[this.app.currentQuestionIndex];
            return {
                chinese: current ? current.chinese : '无当前题目',
                english: current ? current.english : [],
                index: this.app.currentQuestionIndex + 1,
                total: this.app.currentQuestions.length
            };
        }
        return '无当前题目';
    },

    // 清除数据缓存（开发工具）
    clearCache() {
        if (this.app && this.app.dataManager) {
            this.app.dataManager.clearCache();
            return '已清除数据缓存，下次加载将重新获取最新数据';
        }
        return '应用尚未初始化';
    },

    // 强制重新加载当前单元
    async reloadCurrentUnit() {
        if (this.app && this.app.currentGrade && this.app.currentUnit) {
            this.app.dataManager.clearCache();
            this.app.currentQuestions = await this.app.dataManager.getQuestionsForUnit(
                this.app.currentGrade, 
                this.app.currentUnit, 
                true // 强制重新加载
            );
            this.app.currentQuestionIndex = 0;
            this.app.displayCurrentQuestion();
            return '已重新加载当前单元数据';
        }
        return '没有正在学习的单元';
    }
};

// 在页面加载完成后初始化应用
let appInstance;
document.addEventListener('DOMContentLoaded', () => {
    // 动态导入模块以确保兼容性
    import('./app.js').then(({ EnglishReviewApp }) => {
        appInstance = new EnglishReviewApp();

        // 设置全局引用
        window.EnglishReview.app = appInstance;

        // 导出版本信息
        console.log('英语复习助手 v1.0.0 已加载');
        console.log('调试命令已启用：EnglishReview.nextQuestion() 等');
        console.log('清除缓存：EnglishReview.clearCache() 或按 Ctrl+Shift+R');
        console.log('重新加载当前单元：EnglishReview.reloadCurrentUnit()');
    }).catch(error => {
        console.error('应用加载失败:', error);
    });
});

// 设置错误处理
window.addEventListener('error', function(event) {
    console.error('捕获到全局错误:', event.error);
    // 可添加错误上报或友好提示
});

// 添加开发工具快捷键：Ctrl+Shift+R 清除缓存并重新加载当前单元
document.addEventListener('keydown', function(event) {
    // Ctrl+Shift+R (Windows/Linux) 或 Cmd+Shift+R (Mac)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        if (window.EnglishReview && window.EnglishReview.app) {
            window.EnglishReview.reloadCurrentUnit().then(result => {
                console.log('🔄', result);
            }).catch(error => {
                console.error('重新加载失败:', error);
            });
        } else {
            console.log('⚠️ 应用尚未初始化');
        }
    }
});
