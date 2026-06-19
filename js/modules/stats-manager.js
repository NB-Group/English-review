/**
 * 统计管理器
 * 负责学习数据的统计和分析
 */

export class StatsManager {
    constructor() {
        this.storageKey = 'english_review_stats_v2';
        this.sessionKey = 'english_review_session';
        this.stats = this.loadStats();
        this.currentSession = this.initSession();
    }
    
    /**
     * 初始化会话
     */
    initSession() {
        return {
            startTime: Date.now(),
            grade: null,
            unit: null,
            questions: [],
            totalTime: 0,
            correctCount: 0,
            wrongCount: 0,
            streak: 0,
            maxStreak: 0
        };
    }
    
    /**
     * 加载统计数据
     */
    loadStats() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
        }
        
        return {
            totalSessions: 0,
            totalQuestions: 0,
            totalCorrect: 0,
            totalWrong: 0,
            totalTime: 0,
            averageAccuracy: 0,
            bestStreak: 0,
            gradeStats: {},
            unitStats: {},
            dailyStats: {},
            weeklyStats: {},
            monthlyStats: {},
            wrongAnswers: [],
            achievements: [],
            lastStudyDate: null,
            studyDays: 0,
            consecutiveDays: 0
        };
    }
    
    /**
     * 保存统计数据
     */
    saveStats() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
            return true;
        } catch (error) {
            console.error('保存统计数据失败:', error);
            return false;
        }
    }
    
    /**
     * 开始新会话
     */
    startSession(grade, unit) {
        this.currentSession = this.initSession();
        this.currentSession.grade = grade;
        this.currentSession.unit = unit;
        this.currentSession.startTime = Date.now();
    }
    
    /**
     * 更新答题统计
     */
    updateStats(grade, unit, isCorrect, questionData = null) {
        const now = Date.now();
        const today = new Date().toDateString();
        
        // 更新当前会话
        this.currentSession.questions.push({
            timestamp: now,
            isCorrect: isCorrect,
            question: questionData
        });
        
        if (isCorrect) {
            this.currentSession.correctCount++;
            this.currentSession.streak++;
            this.currentSession.maxStreak = Math.max(this.currentSession.maxStreak, this.currentSession.streak);
        } else {
            this.currentSession.wrongCount++;
            this.currentSession.streak = 0;
            
            // 记录错题
            if (questionData) {
                this.addWrongAnswer(grade, unit, questionData);
            }
        }
        
        // 更新总体统计
        this.stats.totalQuestions++;
        if (isCorrect) {
            this.stats.totalCorrect++;
        } else {
            this.stats.totalWrong++;
        }
        
        // 更新准确率
        this.stats.averageAccuracy = (this.stats.totalCorrect / this.stats.totalQuestions) * 100;
        
        // 更新最佳连击
        this.stats.bestStreak = Math.max(this.stats.bestStreak, this.currentSession.maxStreak);
        
        // 更新年级统计
        if (!this.stats.gradeStats[grade]) {
            this.stats.gradeStats[grade] = { total: 0, correct: 0, wrong: 0, accuracy: 0 };
        }
        this.stats.gradeStats[grade].total++;
        if (isCorrect) {
            this.stats.gradeStats[grade].correct++;
        } else {
            this.stats.gradeStats[grade].wrong++;
        }
        this.stats.gradeStats[grade].accuracy = 
            (this.stats.gradeStats[grade].correct / this.stats.gradeStats[grade].total) * 100;
        
        // 更新单元统计
        const unitKey = `${grade}-${unit}`;
        if (!this.stats.unitStats[unitKey]) {
            this.stats.unitStats[unitKey] = { total: 0, correct: 0, wrong: 0, accuracy: 0, grade, unit };
        }
        this.stats.unitStats[unitKey].total++;
        if (isCorrect) {
            this.stats.unitStats[unitKey].correct++;
        } else {
            this.stats.unitStats[unitKey].wrong++;
        }
        this.stats.unitStats[unitKey].accuracy = 
            (this.stats.unitStats[unitKey].correct / this.stats.unitStats[unitKey].total) * 100;
        
        // 更新日统计
        if (!this.stats.dailyStats[today]) {
            this.stats.dailyStats[today] = { total: 0, correct: 0, wrong: 0, time: 0 };
        }
        this.stats.dailyStats[today].total++;
        if (isCorrect) {
            this.stats.dailyStats[today].correct++;
        } else {
            this.stats.dailyStats[today].wrong++;
        }
        
        // 更新学习天数
        this.updateStudyDays(today);
        
        // 检查成就
        this.checkAchievements();
        
        this.saveStats();
    }
    
    /**
     * 添加错题
     */
    addWrongAnswer(grade, unit, questionData) {
        const wrongAnswer = {
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            grade: grade,
            unit: unit,
            chinese: questionData.chinese,
            correct: Array.isArray(questionData.english) ? questionData.english[0] : questionData.english,
            userAnswer: questionData.userAnswer || '',
            reviewCount: 0,
            mastered: false
        };
        
        // 检查是否已存在相同错题
        const existing = this.stats.wrongAnswers.find(w => 
            w.chinese === wrongAnswer.chinese && w.grade === grade && w.unit === unit
        );
        
        if (!existing) {
            this.stats.wrongAnswers.push(wrongAnswer);
        } else {
            // 更新现有错题的时间戳
            existing.timestamp = wrongAnswer.timestamp;
            existing.reviewCount = (existing.reviewCount || 0) + 1;
        }
    }
    
    /**
     * 标记错题为已掌握
     */
    markWrongAnswerMastered(wrongAnswerId) {
        const wrongAnswer = this.stats.wrongAnswers.find(w => w.id === wrongAnswerId);
        if (wrongAnswer) {
            wrongAnswer.mastered = true;
            this.saveStats();
        }
    }
    
    /**
     * 获取错题列表
     */
    getWrongAnswers(grade = null, unit = null, onlyUnmastered = true) {
        let filtered = this.stats.wrongAnswers;

        if (grade) {
            filtered = filtered.filter(w => w.grade === grade);
        }

        if (unit) {
            filtered = filtered.filter(w => w.unit === unit);
        }

        if (onlyUnmastered) {
            filtered = filtered.filter(w => !w.mastered);
        }

        return filtered.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * 获取所有错题（包括已掌握的）
     */
    getAllWrongAnswers() {
        return [...this.stats.wrongAnswers];
    }

    /**
     * 获取错题统计信息
     */
    getWrongAnswersStats() {
        const allWrongAnswers = this.getAllWrongAnswers();
        const mastered = allWrongAnswers.filter(w => w.mastered).length;
        const total = allWrongAnswers.length;

        return {
            total,
            mastered,
            unmastered: total - mastered
        };
    }

    /**
     * 清空所有错题
     */
    clearAllWrongAnswers() {
        this.stats.wrongAnswers = [];
        this.saveStats();
    }

    /**
     * 删除特定错题
     */
    removeWrongAnswer(wrongAnswerId) {
        this.stats.wrongAnswers = this.stats.wrongAnswers.filter(w => w.id !== wrongAnswerId);
        this.saveStats();
    }
    
    /**
     * 结束当前会话
     */
    endSession() {
        const endTime = Date.now();
        const sessionTime = endTime - this.currentSession.startTime;
        
        this.currentSession.totalTime = sessionTime;
        this.stats.totalTime += sessionTime;
        this.stats.totalSessions++;
        
        // 更新日统计时间
        const today = new Date().toDateString();
        if (this.stats.dailyStats[today]) {
            this.stats.dailyStats[today].time += sessionTime;
        }
        
        this.saveStats();
        
        const sessionSummary = {
            ...this.currentSession,
            accuracy: this.currentSession.questions.length > 0 
                ? (this.currentSession.correctCount / this.currentSession.questions.length) * 100 
                : 0
        };
        
        return sessionSummary;
    }
    
    /**
     * 更新学习天数
     */
    updateStudyDays(today) {
        const lastStudyDate = this.stats.lastStudyDate;
        
        if (!lastStudyDate || lastStudyDate !== today) {
            this.stats.studyDays++;
            
            if (lastStudyDate) {
                const lastDate = new Date(lastStudyDate);
                const currentDate = new Date(today);
                const diffTime = currentDate - lastDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    this.stats.consecutiveDays++;
                } else {
                    this.stats.consecutiveDays = 1;
                }
            } else {
                this.stats.consecutiveDays = 1;
            }
            
            this.stats.lastStudyDate = today;
        }
    }
    
    /**
     * 检查成就
     */
    checkAchievements() {
        const achievements = [
            {
                id: 'first_correct',
                name: '初出茅庐',
                description: '答对第一道题',
                condition: () => this.stats.totalCorrect >= 1,
                icon: '🎯'
            },
            {
                id: 'streak_5',
                name: '连击高手',
                description: '连续答对5题',
                condition: () => this.stats.bestStreak >= 5,
                icon: '🔥'
            },
            {
                id: 'streak_10',
                name: '连击大师',
                description: '连续答对10题',
                condition: () => this.stats.bestStreak >= 10,
                icon: '⚡'
            },
            {
                id: 'accuracy_80',
                name: '准确射手',
                description: '总正确率达到80%',
                condition: () => this.stats.averageAccuracy >= 80,
                icon: '🎯'
            },
            {
                id: 'questions_100',
                name: '百题达人',
                description: '累计答题100道',
                condition: () => this.stats.totalQuestions >= 100,
                icon: '📚'
            },
            {
                id: 'consecutive_7',
                name: '坚持不懈',
                description: '连续学习7天',
                condition: () => this.stats.consecutiveDays >= 7,
                icon: '📅'
            }
        ];
        
        achievements.forEach(achievement => {
            if (!this.stats.achievements.includes(achievement.id) && achievement.condition()) {
                this.stats.achievements.push(achievement.id);
                this.showAchievementNotification(achievement);
            }
        });
    }
    
    /**
     * 显示成就通知
     */
    showAchievementNotification(achievement) {
        // 触发成就事件
        window.dispatchEvent(new CustomEvent('achievementUnlocked', {
            detail: achievement
        }));
    }
    
    /**
     * 获取统计摘要
     */
    getStatsSummary() {
        return {
            totalQuestions: this.stats.totalQuestions,
            totalCorrect: this.stats.totalCorrect,
            totalWrong: this.stats.totalWrong,
            accuracy: this.stats.averageAccuracy,
            bestStreak: this.stats.bestStreak,
            studyDays: this.stats.studyDays,
            consecutiveDays: this.stats.consecutiveDays,
            totalSessions: this.stats.totalSessions,
            averageSessionTime: this.stats.totalSessions > 0 ? this.stats.totalTime / this.stats.totalSessions : 0,
            wrongAnswersCount: this.getWrongAnswers().length,
            achievements: this.stats.achievements.length
        };
    }
    
    /**
     * 获取年级统计
     */
    getGradeStats(grade = null) {
        if (grade) {
            return this.stats.gradeStats[grade] || { total: 0, correct: 0, wrong: 0, accuracy: 0 };
        }
        return this.stats.gradeStats;
    }
    
    /**
     * 获取单元统计
     */
    getUnitStats(grade = null) {
        let units = Object.values(this.stats.unitStats);
        
        if (grade) {
            units = units.filter(unit => unit.grade === grade);
        }
        
        return units.sort((a, b) => b.total - a.total);
    }
    
    /**
     * 获取最近学习数据
     */
    getRecentStats(days = 7) {
        const recent = {};
        const now = new Date();
        
        for (let i = 0; i < days; i++) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toDateString();
            recent[dateStr] = this.stats.dailyStats[dateStr] || { total: 0, correct: 0, wrong: 0, time: 0 };
        }
        
        return recent;
    }
    
    /**
     * 导出统计数据
     */
    exportStats() {
        const exportData = {
            stats: this.stats,
            exportTime: Date.now(),
            version: '2.0'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `english_review_stats_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * 导出错题本为 DOC (Word 可打开的双栏 HTML)
     */
    exportWrongAnswers() {
        const allWrongAnswers = this.getAllWrongAnswers();
        if (allWrongAnswers.length === 0) {
            return false;
        }

        // 清洗中文文本：去掉 [词转特训] 等标签前缀
        const cleanChinese = (text) => {
            return (text || '')
                .replace(/^\[词转特训\]\s*/g, '')
                .replace(/\[.*?\]/g, '')
                .trim();
        };

        // 按年级和单元分组
        const grouped = {};
        allWrongAnswers.forEach(wrong => {
            const key = `${wrong.grade}年级-${wrong.unit}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(wrong);
        });

        let rows = '';
        Object.keys(grouped).sort().forEach(key => {
            rows += `<tr><td colspan="2" class="section">${key}</td></tr>`;
            grouped[key].forEach((wrong, index) => {
                rows += `
                <tr>
                    <td class="cn">${index + 1}. ${cleanChinese(wrong.chinese)}</td>
                    <td class="en">${wrong.correct}</td>
                </tr>`;
            });
        });

        const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>错题本</title>
<style>
  body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; }
  h1 { text-align: center; font-size: 18pt; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 10px; border: 1px solid #ccc; vertical-align: top; }
  td.cn { width: 50%; }
  td.en { width: 50%; font-family: 'Segoe UI', Calibri, sans-serif; }
  td.section { background: #f0f0f0; font-weight: bold; font-size: 11pt; text-align: center; }
</style></head>
<body>
  <h1>错题本</h1>
  <table>${rows}</table>
</body>
</html>`;

        const blob = new Blob(['﻿' + html], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `错题本_${new Date().toISOString().split('T')[0]}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }
    
    /**
     * 清空统计数据
     */
    clearStats() {
        this.stats = {
            totalSessions: 0,
            totalQuestions: 0,
            totalCorrect: 0,
            totalWrong: 0,
            totalTime: 0,
            averageAccuracy: 0,
            bestStreak: 0,
            gradeStats: {},
            unitStats: {},
            dailyStats: {},
            weeklyStats: {},
            monthlyStats: {},
            wrongAnswers: [],
            achievements: [],
            lastStudyDate: null,
            studyDays: 0,
            consecutiveDays: 0
        };
        
        localStorage.removeItem(this.storageKey);
        return true;
    }
}
