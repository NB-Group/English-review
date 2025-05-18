/**
 * 错题管理模块
 * 负责错题的收集、存储和管理
 */

import { STORAGE_KEYS, DOM_IDS } from '../config/constants.js';
import { getFromStorage, saveToStorage } from '../utils/storage.js';
import { showMessage } from './message.js';
import { playAudioMessage } from './audio.js';
import { getCurrentFileName } from './data.js';

// 存储错题列表
let wrongAnswers = [];

/**
 * 初始化错题管理器
 * @returns {Array} 当前错题列表
 */
export function initErrorManager() {
    // 尝试从本地存储恢复错题
    restoreWrongAnswers();
    
    return wrongAnswers;
}

/**
 * 从本地存储恢复错题列表
 */
function restoreWrongAnswers() {
    const savedWrongAnswers = getFromStorage(STORAGE_KEYS.WRONG_ANSWERS);
    
    if (savedWrongAnswers && Array.isArray(savedWrongAnswers)) {
        wrongAnswers = savedWrongAnswers;
        
        // 仅在有错题时恢复显示
        if (wrongAnswers.length > 0) {
            updateErrorListUI();
            showMessage(`找到了你之前的${wrongAnswers.length}道错题哦～`, "info");
        }
    }
}

/**
 * 更新错题列表UI
 */
function updateErrorListUI() {
    const errorItems = document.getElementById(DOM_IDS.ERROR_ITEMS);
    if (!errorItems) return;
    
    // 清空现有列表
    errorItems.innerHTML = "";
    
    // 添加错题到UI
    wrongAnswers.forEach(qa => {
        const errorItem = document.createElement("li");
        errorItem.className = "error-item";
        // 处理可能没有 highlightedAnswer 的情况（例如导入的错题）
        const highlighted = qa.highlightedAnswer || qa.english; 
        errorItem.innerHTML = `
            <div class="error-chinese">${qa.chinese}</div>
            <div class="error-correct">正确: ${highlighted}</div>
            <div class="error-user">你的答案: ${qa.userAnswer}</div>
        `;
        errorItems.appendChild(errorItem);
    });
}

/**
 * 添加错题
 * @param {Object} qaItem - 错题项 {english, chinese, userAnswer, highlightedAnswer}
 */
export function addWrongAnswer(qaItem) {
    if (!qaItem || !qaItem.english || !qaItem.chinese || !qaItem.userAnswer) {
        console.error("添加错题失败: 缺少必要字段");
        return false;
    }
    
    // 检查是否已存在相同的错题
    const exists = wrongAnswers.some(qa => 
        qa.english === qaItem.english && 
        qa.chinese === qaItem.chinese
    );
    
    if (!exists) {
        wrongAnswers.push(qaItem);
        updateErrorListUI();
        saveWrongAnswers();
        return true;
    }
    
    return false;
}

/**
 * 批量添加错题
 * @param {Array} qaItems - 错题项数组
 * @returns {number} 添加的错题数量
 */
export function addWrongAnswers(qaItems) {
    if (!Array.isArray(qaItems) || qaItems.length === 0) {
        return 0;
    }
    
    let addedCount = 0;
    qaItems.forEach(item => {
        if (addWrongAnswer(item)) {
            addedCount++;
        }
    });
    
    return addedCount;
}

/**
 * 清空错题列表
 */
export function clearWrongAnswers() {
    wrongAnswers = [];
    updateErrorListUI();
    saveWrongAnswers();
}

/**
 * 获取错题列表
 * @returns {Array} 错题列表
 */
export function getWrongAnswers() {
    return [...wrongAnswers];
}

/**
 * 保存错题列表到本地存储
 */
function saveWrongAnswers() {
    saveToStorage(STORAGE_KEYS.WRONG_ANSWERS, wrongAnswers);
    saveToStorage(STORAGE_KEYS.CURRENT_FILE, getCurrentFileName());
}

/**
 * 导出错题为文档
 * @returns {Promise} 导出结果的Promise
 */
export async function exportWrongAnswers() {
    if (wrongAnswers.length === 0) {
        showMessage("没有错题可以导出呢", "warning");
        playAudioMessage(null, "喵呜～没有错题可以导出呢.mp3");
        return Promise.reject("没有错题可导出");
    }

    try {
        // 确保docx库已加载
        if (typeof window.docx === 'undefined') {
            throw new Error("docx库未加载");
        }
        
        const { Document, Paragraph, TextRun, Packer } = window.docx;

        const doc = new Document({
            sections: [{
                properties: {},
                children: wrongAnswers.map(qa => {
                    // 处理高亮部分
                    const parts = qa.highlightedAnswer ? 
                        qa.highlightedAnswer.split(/<span class="highlight">|<\/span>/) :
                        [qa.english];
                        
                    const runs = parts.map((part, index) => {
                        if (index % 2 === 1) { // 需要高亮的部分
                            return new TextRun({
                                text: part,
                                highlight: "yellow"
                            });
                        }
                        return new TextRun({
                            text: part
                        });
                    });

                    return new Paragraph({
                        children: [
                            ...runs,
                            new TextRun({ text: ' - ' }),
                            new TextRun({ text: qa.chinese }),
                            new TextRun({ text: '\n错误答案: ' }),
                            new TextRun({ text: qa.userAnswer })
                        ]
                    });
                })
            }]
        });

        // 生成并下载文档
        const blob = await Packer.toBlob(doc);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${getCurrentFileName() || "英语复习"}错题集.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showMessage("错题导出成功啦！可以回去好好复习哦～", "success");
        playAudioMessage(null, "喵～错题导出成功啦喵～啦！可以回去好好复习哦～.mp3");
        return true;
    } catch (error) {
        console.error('导出错题时出错:', error);
        showMessage("导出错题时出错了呢", "error");
        return Promise.reject(error);
    }
}

/**
 * 导入错题
 * @param {File} file - docx文件对象
 * @returns {Promise} 导入结果的Promise
 */
export async function importWrongAnswers(file) {
    if (!file || !file.name.endsWith('.docx')) {
        showMessage("请选择 .docx 格式的文件哦", "warning");
        return Promise.reject("文件格式错误");
    }
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(event) {
            try {
                const arrayBuffer = event.target.result;
                // 确保 docx, PizZip, docxtemplater 库已通过 <script> 标签加载
                
                // 显式从 window 对象访问 PizZip 和 docxtemplater
                if (typeof window.PizZip === 'undefined' || typeof window.docxtemplater === 'undefined') {
                    showMessage("导入所需的库未能加载喵～", "error");
                    return reject("库加载失败");
                }
                
                const zip = new window.PizZip(arrayBuffer);
                const doc = new window.docxtemplater(zip, { 
                    paragraphLoop: true,
                    linebreaks: true,
                });
                
                // 获取文档的纯文本内容
                const textContent = doc.getFullText(); 
                const lines = textContent.split('\n').filter(line => line.trim() !== '');
                
                let importedCount = 0;
                
                // 解析每一行
                lines.forEach(line => {
                    line = line.trim();
                    
                    // 检查行是否包含必要的分隔符
                    if (line.includes(' - ') && line.includes('错误答案: ')) {
                        try {
                            // 按 '错误答案: ' 分割
                            const parts = line.split('错误答案: ');
                            const qaPart = parts[0].trim();
                            const userAnswer = parts[1] ? parts[1].trim() : '';
                            
                            // 按 ' - ' 分割前半部分
                            const qaParts = qaPart.split(' - ');
                            
                            if (qaParts.length >= 2) {
                                const currentEnglish = qaParts[0].trim();
                                // 处理中文可能包含 ' - '
                                const currentChinese = qaParts.slice(1).join(' - ').trim();
                                
                                if (currentEnglish && currentChinese && userAnswer) {
                                    // 创建错题对象
                                    const newWrongAnswer = {
                                        english: currentEnglish,
                                        chinese: currentChinese,
                                        userAnswer: userAnswer,
                                        highlightedAnswer: currentEnglish // 导入时无高亮信息
                                    };
                                    
                                    if (addWrongAnswer(newWrongAnswer)) {
                                        importedCount++;
                                    }
                                }
                            }
                        } catch (parseError) {
                            console.warn(`解析行时出错: "${line}"`, parseError);
                        }
                    }
                });

                if (importedCount > 0) {
                    showMessage(`成功导入了 ${importedCount} 道错题！`, "success");
                    resolve(importedCount);
                } else {
                    showMessage("没有找到符合格式的新错题可以导入呢", "info");
                    resolve(0);
                }

            } catch (error) {
                console.error('导入 DOCX 错题时出错:', error);
                showMessage("导入错题文件时出错了呢", "error");
                reject(error);
            } 
        };
        
        reader.onerror = function() {
            showMessage("读取文件失败了呢", "error");
            reject(new Error("文件读取失败"));
        };
        
        reader.readAsArrayBuffer(file);
    });
}
