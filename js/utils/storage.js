/**
 * 本地存储工具
 * 提供本地存储的读写和操作功能
 */

/**
 * 保存数据到本地存储
 * @param {string} key - 存储键名
 * @param {any} data - 要保存的数据
 * @returns {boolean} - 保存是否成功
 */
export function saveToStorage(key, data) {
    try {
        const serializedData = JSON.stringify(data);
        localStorage.setItem(key, serializedData);
        return true;
    } catch (error) {
        console.error(`保存数据到本地存储失败 [${key}]:`, error);
        return false;
    }
}

/**
 * 从本地存储读取数据
 * @param {string} key - 存储键名
 * @param {any} defaultValue - 如果键不存在时返回的默认值
 * @returns {any} - 读取的数据或默认值
 */
export function getFromStorage(key, defaultValue = null) {
    try {
        const serializedData = localStorage.getItem(key);
        if (serializedData === null) {
            return defaultValue;
        }
        return JSON.parse(serializedData);
    } catch (error) {
        console.error(`从本地存储读取数据失败 [${key}]:`, error);
        return defaultValue;
    }
}

/**
 * 从本地存储删除数据
 * @param {string} key - 存储键名
 * @returns {boolean} - 删除是否成功
 */
export function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`从本地存储删除数据失败 [${key}]:`, error);
        return false;
    }
}

/**
 * 清空所有本地存储数据
 * @param {string} prefix - 如果提供，只清除以此前缀开头的键
 * @returns {boolean} - 清空是否成功
 */
export function clearStorage(prefix = null) {
    try {
        if (prefix) {
            // 只清除指定前缀的键
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(prefix)) {
                    localStorage.removeItem(key);
                }
            });
        } else {
            // 清除所有键
            localStorage.clear();
        }
        return true;
    } catch (error) {
        console.error('清空本地存储失败:', error);
        return false;
    }
}

/**
 * 获取本地存储使用情况
 * @returns {Object} 存储使用情况对象 { used, total, percentage }
 */
export function getStorageUsage() {
    try {
        let totalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            totalSize += (key.length + value.length) * 2; // 按照 UTF-16 编码，每个字符占用 2 字节
        }
        
        // 转换为 KB
        const usedKB = (totalSize / 1024).toFixed(2);
        
        // 大多数浏览器的本地存储限制为 5MB
        const totalKB = 5 * 1024; 
        
        // 计算使用百分比
        const percentage = ((totalSize / (totalKB * 1024)) * 100).toFixed(2);
        
        return {
            used: `${usedKB} KB`,
            total: `${totalKB} KB`,
            percentage: `${percentage}%`
        };
    } catch (error) {
        console.error('获取存储使用情况失败:', error);
        return { used: '0 KB', total: '5120 KB', percentage: '0%' };
    }
}
