/**
 * 文件处理模块
 * 处理文件加载、导入和导出功能
 */

import { DOM_IDS } from '../config/constants.js';
import { showMessage } from './message.js';
// 导入 docxData
import { docxData } from '../data/docx-data.js';

/**
 * 初始化文件选择器
 * @param {Function} onFileSelected - 文件选择回调函数
 */
export function initFileSelector(onFileSelected) {
    const fileSelector = document.getElementById(DOM_IDS.FILE_SELECTOR);
    if (!fileSelector) {
        console.error("文件选择器元素未找到");
        return false;
    }
    
    // 确保文档数据已加载 (现在从导入的模块获取)
    if (typeof docxData === 'undefined' || Object.keys(docxData).length === 0) {
        showMessage("文档数据未找到或为空喵～请检查 docx-data.js 文件", "error");
        return false;
    }
    
    // 清空现有选项
    fileSelector.innerHTML = "";
    
    // 添加默认选项
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- 喵～请选择一个文档 --";
    fileSelector.appendChild(defaultOption);
    
    // 添加所有可用文档
    let count = 0;
    for (const docName in docxData) { // 使用导入的 docxData
        const option = document.createElement("option");
        option.value = docName;
        option.textContent = docName;
        fileSelector.appendChild(option);
        count++;
    }
    
    if (count === 0) {
        showMessage("喵呜～找不到任何文档数据呢", "warning");
    } else {
        showMessage(`喵喵～成功加载了${count}个文档哦！`, "success");
    }
    
    // 设置选择事件监听器
    if (typeof onFileSelected === 'function') {
        fileSelector.addEventListener("change", function() {
            const selectedDoc = fileSelector.value;
            if (selectedDoc) {
                onFileSelected(selectedDoc);
            }
        });
    }
    
    return true;
}

/**
 * 获取可用文档列表
 * @returns {string[]} 文档名称数组
 */
export function getAvailableDocuments() {
    if (typeof docxData === 'undefined') {
        return [];
    }
    
    return Object.keys(docxData); // 使用导入的 docxData
}

/**
 * 初始化文件导入输入框
 * @param {Function} onFileImported - 文件导入回调函数
 */
export function initImportFileInput(onFileImported) {
    const importFileInput = document.getElementById(DOM_IDS.IMPORT_FILE_INPUT);
    if (!importFileInput) {
        console.error("导入文件输入框未找到");
        return false;
    }
    
    // 设置文件选择监听器
    if (typeof onFileImported === 'function') {
        importFileInput.addEventListener("change", function(event) {
            const file = event.target.files[0];
            if (file) {
                onFileImported(file)
                    .finally(() => {
                        // 重置文件输入框
                        importFileInput.value = null;
                    });
            }
        });
    }
    
    return true;
}

/**
 * 触发文件导入对话框
 */
export function triggerImportFileDialog() {
    const importFileInput = document.getElementById(DOM_IDS.IMPORT_FILE_INPUT);
    if (importFileInput) {
        importFileInput.click();
    }
}

/**
 * 读取文本文件内容
 * @param {File} file - 要读取的文件
 * @returns {Promise<string>} 文件内容
 */
export function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            resolve(event.target.result);
        };
        
        reader.onerror = function() {
            reject(new Error("文件读取失败"));
        };
        
        reader.readAsText(file);
    });
}

/**
 * 将文本内容导出为文件
 * @param {string} content - 要导出的文本内容
 * @param {string} filename - 文件名
 * @param {string} type - MIME类型
 */
export function exportTextFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

/**
 * 创建并触发文件下载
 * @param {Blob} blob - 文件Blob对象
 * @param {string} filename - 文件名
 */
export function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}
