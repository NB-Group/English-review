/**
 * 通用辅助函数
 */

// Fisher-Yates 洗牌算法 - 随机排序数组
export function shuffleArray(array) {
    const newArray = [...array]; // 创建副本以避免修改原数组
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 格式化时间为 MM:SS
export function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 移除括号及其内容
export function removeBrackets(text) {
    return text.replace(/\([^)]*\)/g, "").trim();
}

// 过滤答案，用于标准化答案比较
export function filterAnswer(text, ignoreWords = []) {
    if (!text) return '';
    
    const textWithoutBrackets = removeBrackets(text);
    
    // 完全移除所有省略号
    let processedText = textWithoutBrackets.replace(/\.{3,}/g, '');
    
    // 统一所有类型的单引号为标准单引号 '
    processedText = processedText.replace(/[''′`]/g, "'");
    
    // 移除所有标点符号，但保留单引号用于所有格判断
    processedText = processedText.replace(/[.,?!;:"()\[\]{}-]/g, "");
    
    // 处理常见缩写和人称代词
    processedText = processedText
        // 处理人称代词和缩写词
        .replace(/\bsb\.\b|\bsomebody\b|\bsomeone\b/gi, "person")
        .replace(/\bsth\.\b|\bsomething\b/gi, "thing")
        .replace(/\banybody\b|\banyone\b/gi, "person")
        .replace(/\banything\b/gi, "thing")
        .replace(/\beverybody\b|\beveryone\b/gi, "people")
        .replace(/\beverything\b/gi, "things")
        .replace(/\bnobody\b|\bno one\b/gi, "noperson")
        .replace(/\bnothing\b/gi, "nothing")
        
        // 处理常见动词缩写
        .replace(/it's/gi, "it is")
        .replace(/don't/gi, "do not")
        .replace(/doesn't/gi, "does not")
        .replace(/can't/gi, "cannot")
        .replace(/i'm/gi, "i am")
        .replace(/you're/gi, "you are")
        .replace(/they're/gi, "they are")
        .replace(/we're/gi, "we are")
        .replace(/he's/gi, "he is")
        .replace(/she's/gi, "she is")
        .replace(/that's/gi, "that is")
        .replace(/what's/gi, "what is")
        .replace(/there's/gi, "there is")
        .replace(/here's/gi, "here is")
        .replace(/who's/gi, "who is")
        .replace(/won't/gi, "will not")
        .replace(/wouldn't/gi, "would not")
        .replace(/shouldn't/gi, "should not")
        .replace(/couldn't/gi, "could not")
        .replace(/let's/gi, "let us")
        .replace(/i've/gi, "i have")
        .replace(/you've/gi, "you have")
        .replace(/we've/gi, "we have")
        .replace(/they've/gi, "they have")
        .replace(/i'd/gi, "i would")
        .replace(/you'd/gi, "you would")
        .replace(/he'd/gi, "he would")
        .replace(/she'd/gi, "she would")
        .replace(/we'd/gi, "we would")
        .replace(/they'd/gi, "they would")
        .replace(/i'll/gi, "i will")
        .replace(/you'll/gi, "you will")
        .replace(/he'll/gi, "he will")
        .replace(/she'll/gi, "she will")
        .replace(/we'll/gi, "we will")
        .replace(/they'll/gi, "they will")
        .replace(/isn't/gi, "is not")
        .replace(/aren't/gi, "are not")
        .replace(/wasn't/gi, "was not")
        .replace(/weren't/gi, "were not")
        .replace(/haven't/gi, "have not")
        .replace(/hasn't/gi, "has not")
        .replace(/hadn't/gi, "had not");
    
    return processedText
        .split(" ")
        .filter(word => !ignoreWords.includes(word.toLowerCase()) && word !== "")
        .join(" ")
        .toLowerCase()
        .replace(/(\w+)s\b/g, "$1"); // 将复数形式转为单数进行比较
}

// 检查连接词调换情况（如 "cat and dog" vs "dog and cat"）
export function checkConnectedPhrases(text1, text2, ignoreWords = []) {
    const andPattern = /(.+)\s+and\s+(.+)/i;
    const orPattern = /(.+)\s+or\s+(.+)/i;

    const match1And = text1.match(andPattern);
    const match2And = text2.match(andPattern);
    const match1Or = text1.match(orPattern);
    const match2Or = text2.match(orPattern);

    if (match1And && match2And) {
        const [, part1a, part1b] = match1And;
        const [, part2a, part2b] = match2And;
        // 检查正序和反序
        return (
            (filterAnswer(part1a, ignoreWords) === filterAnswer(part2a, ignoreWords) &&
                filterAnswer(part1b, ignoreWords) === filterAnswer(part2b, ignoreWords)) ||
            (filterAnswer(part1a, ignoreWords) === filterAnswer(part2b, ignoreWords) &&
                filterAnswer(part1b, ignoreWords) === filterAnswer(part2a, ignoreWords))
        );
    }

    if (match1Or && match2Or) {
        const [, part1a, part1b] = match1Or;
        const [, part2a, part2b] = match2Or;
        // 检查正序和反序
        return (
            (filterAnswer(part1a, ignoreWords) === filterAnswer(part2a, ignoreWords) &&
                filterAnswer(part1b, ignoreWords) === filterAnswer(part2b, ignoreWords)) ||
            (filterAnswer(part1a, ignoreWords) === filterAnswer(part2b, ignoreWords) &&
                filterAnswer(part1b, ignoreWords) === filterAnswer(part2a, ignoreWords))
        );
    }

    return false;
}

// 检查斜杠选项（如 "play/watch" 的一个选项匹配）
export function checkSlashOptions(userAnswerText, correctAnswers, ignoreWords = []) {
    if (userAnswerText.includes("/")) {
        const options = userAnswerText.split("/").map(opt => opt.trim());
        return correctAnswers.some(correctAnswer => 
            options.some(option => filterAnswer(option, ignoreWords) === filterAnswer(correctAnswer, ignoreWords))
        );
    }
    return false;
}

// 高亮错误答案的错误部分
export function highlightIncorrectParts(correctAnswer, userAnswer, ignoreWords = []) {
    // 将正确答案拆分为单词数组
    const correctWords = correctAnswer.split(" ");
    
    // 创建用户词汇的频率映射
    const userWordFreq = {};
    // 规范化用户输入的单词
    const normalizedUserWords = userAnswer.split(" ").map(word => {
        // 统一处理省略号和单引号
        return word.replace(/\.{3,}/g, '').replace(/[''′`]/g, "'");
    });
    
    // 构建词频映射
    normalizedUserWords.forEach(word => {
        const normWord = filterAnswer(word, ignoreWords);
        if (normWord) { // 确保空字符串不被计入
            userWordFreq[normWord] = (userWordFreq[normWord] || 0) + 1;
        }
    });
    
    // 标记正确答案中的单词
    const result = correctWords.map(word => {
        const normWord = filterAnswer(word, ignoreWords);
        
        // 冠词和括号内容不做判断
        if (ignoreWords.includes(word.toLowerCase()) || word.match(/^\(.*\)$/)) {
            return word;
        }
        
        // 检查此单词是否在用户答案中且还有剩余计数
        if (normWord && userWordFreq[normWord] && userWordFreq[normWord] > 0) {
            userWordFreq[normWord]--; // 减少可用计数
            return word; // 这个词是正确的
        }
        
        return `<span class="highlight">${word}</span>`; // 标记为错误
    });
    
    return result.join(" ");
}

// 通用的防抖函数
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 通用的节流函数
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
