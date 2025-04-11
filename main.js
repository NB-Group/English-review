// 检测暗色模式设置
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}

// 背景图片设置
const portraitImage = "https://tse1-mm.cn.bing.net/th/id/OIP-C.ou_YfaL0ItK-fTJeQIrzywHaNK?rs=1&pid=ImgDetMain";
const landscapeImage = "https://upload-bbs.miyoushe.com/upload/2024/06/19/357876319/0e3f34f4cc8e630e07b53fa7e5031eb1_1173320463818551770.jpg";

// 根据屏幕方向设置背景图片
function setBackgroundByOrientation() {
    const isLandscape = window.innerWidth > window.innerHeight;
    document.body.style.backgroundImage = `url(${isLandscape ? landscapeImage : portraitImage})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
}

// 猫娘风格消息提示
function message(text, type = "info") {
    // 将普通提示转换为猫娘风格
    const catgirlPrefix = ["喵～", "呜喵～", "喵喵～", "喵呜～", "nya～"];
    const randomPrefix = catgirlPrefix[Math.floor(Math.random() * catgirlPrefix.length)];
    
    // 转换常见提示语为猫娘风格
    let catgirlText = text;
    
    if (text.includes("成功")) {
        catgirlText = text.replace("成功", "成功啦喵～");
    } else if (text.includes("错误")) {
        catgirlText = text.replace("错误", "出错了呜呜～");
    } else if (text.includes("警告")) {
        catgirlText = text.replace("警告", "要小心喵～");
    } else if (text.includes("完成")) {
        catgirlText = text.replace("完成", "完成啦喵～");
    } else if (text.match(/^回答正确/)) {
        catgirlText = "喵呜～答对啦！主人真是太厉害了～";
    } else if (text.match(/^回答错误/)) {
        catgirlText = "呜喵...答错了呢，不要灰心哦～正确答案是：" + text.split("：")[1];
    } else if (!text.includes("喵")) {
        // 如果没有猫娘特征，添加一个
        catgirlText = `${randomPrefix} ${text}`;
    }
    
    const messageEl = document.getElementById('message');
    messageEl.textContent = catgirlText;
    messageEl.style.display = 'block';
    
    // 重置所有类型
    messageEl.className = '';
    messageEl.classList.add(`message-${type}`);
    
    // 自动隐藏（错误消息除外）
    if (type !== "error") {
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    // 获取DOM元素
    const fileSelector = document.getElementById("file-selector");
    const chineseText = document.getElementById("chinese-text");
    const answerInput = document.getElementById("answer-input");
    const errorList = document.getElementById("error-list");
    const errorItems = document.getElementById("error-items");
    const progressBar = document.getElementById("progress-bar-inner");
    const progressText = document.getElementById("progress-text");
    const submitBtn = document.getElementById("submit-button");
    const retryBtn = document.getElementById("retry-button");
    const exportBtn = document.getElementById("export-button");
    
    // 状态变量
    let currentIndex = 0;
    let qaPairs = [];
    let wrongAnswers = [];
    let isRetryMode = false;
    let currentFileName = "";
    
    // 设置背景图片 (可选)
    document.body.style.backgroundImage = "url(https://api.paugram.com/bing/)";

    // 设置初始背景图片并添加屏幕旋转监听
    setBackgroundByOrientation();
    window.addEventListener('resize', setBackgroundByOrientation);

    // 初始化文档选择器
    function initFileSelector() {
        // 确保文档数据已加载
        if (typeof docxData === 'undefined') {
            message("文档数据未找到喵～请确保已引入docx-data.js文件", "error");
            return;
        }
        
        // 添加默认选项
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "-- 喵～请选择一个文档 --";
        fileSelector.appendChild(defaultOption);
        
        // 添加所有可用文档
        let count = 0;
        for (const docName in docxData) {
            const option = document.createElement("option");
            option.value = docName;
            option.textContent = docName;
            fileSelector.appendChild(option);
            count++;
        }
        
        if (count === 0) {
            message("喵呜～找不到任何文档数据呢", "warning");
        } else {
            message(`喵喵～成功加载了${count}个文档哦！`, "success");
        }
    }
    
    // 处理文档选择
    fileSelector.addEventListener("change", function() {
        const selectedDoc = fileSelector.value;
        if (!selectedDoc) return;
        
        if (docxData[selectedDoc]) {
            currentFileName = selectedDoc;
            qaPairs = [...docxData[selectedDoc]];
            
            // 随机排序题目
            shuffleArray(qaPairs);
            
            currentIndex = 0;
            wrongAnswers = [];
            errorItems.innerHTML = "";
            isRetryMode = false;
            
            updateProgressBar();
            displayNext();
            message(`喵～已加载"${selectedDoc}"，共${qaPairs.length}道题目等着主人来解答呢！`, "success");
        } else {
            message("呜呜～无法加载所选文档呢", "error");
        }
    });
    
    // Fisher-Yates 洗牌算法
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    // 更新进度条
    function updateProgressBar() {
        const total = qaPairs.length;
        const progress = currentIndex;
        const percentage = total > 0 ? (progress / total) * 100 : 0;
        
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${progress}/${total}`;
        
        // 禁用或启用提交按钮
        submitBtn.disabled = currentIndex >= qaPairs.length;
    }

    // 处理答案提交
    function handleSubmit() {
        if (currentIndex >= qaPairs.length) return;
        
        const userAnswer = answerInput.value.trim();
        if (!userAnswer) {
            message("喵～请输入答案再提交哦", "warning");
            return;
        }
        
        const correctAnswer = qaPairs[currentIndex].english;
        
        // 定义要忽略的虚词
        const ignoreWords = ["the", "a", "an"];

        // 移除括号及其内容
        const removeBrackets = (text) => {
            return text.replace(/\([^)]*\)/g, "").trim();
        };

        // 过滤函数：去除虚词、括号内容并转换为小写
        const filterAnswer = (text) => {
            const textWithoutBrackets = removeBrackets(text);
            return textWithoutBrackets
                .split(" ")
                .filter((word) => !ignoreWords.includes(word.toLowerCase()))
                .join(" ")
                .toLowerCase();
        };

        // 比较处理后的答案
        if (filterAnswer(userAnswer) === filterAnswer(correctAnswer)) {
            message("喵呜～答对啦！主人真是太聪明了～", "success");
        } else {
            // 检查是否包含连接词调换的情况
            const checkConnectedPhrases = (text1, text2) => {
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
                        (filterAnswer(part1a) === filterAnswer(part2a) &&
                            filterAnswer(part1b) === filterAnswer(part2b)) ||
                        (filterAnswer(part1a) === filterAnswer(part2b) &&
                            filterAnswer(part1b) === filterAnswer(part2a))
                    );
                }

                if (match1Or && match2Or) {
                    const [, part1a, part1b] = match1Or;
                    const [, part2a, part2b] = match2Or;
                    // 检查正序和反序
                    return (
                        (filterAnswer(part1a) === filterAnswer(part2a) &&
                            filterAnswer(part1b) === filterAnswer(part2b)) ||
                        (filterAnswer(part1a) === filterAnswer(part2b) &&
                            filterAnswer(part1b) === filterAnswer(part2a))
                    );
                }

                return false;
            };

            if (!checkConnectedPhrases(userAnswer, correctAnswer)) {
                // 计算错误部分并高亮显示
                const correctWords = correctAnswer.split(" ");
                const userWords = userAnswer.split(" ");

                const highlightedAnswer = correctWords
                    .map((word, index) => {
                        const userWord = userWords[index] || "";
                        if (
                            ignoreWords.includes(word.toLowerCase()) ||
                            word.match(/^\(.*\)$/) ||
                            removeBrackets(userWord).toLowerCase() ===
                            removeBrackets(word).toLowerCase()
                        ) {
                            return word;
                        }
                        return `<span class="highlight">${word}</span>`;
                    })
                    .join(" ");

                wrongAnswers.push({
                    english: correctAnswer,
                    chinese: qaPairs[currentIndex].chinese,
                    userAnswer: userAnswer,
                    highlightedAnswer: highlightedAnswer
                });

                const errorItem = document.createElement("li");
                errorItem.className = "error-item";
                errorItem.innerHTML = `
                    <div class="error-chinese">${qaPairs[currentIndex].chinese}</div>
                    <div class="error-correct">正确: ${highlightedAnswer}</div>
                    <div class="error-user">你的答案: ${userAnswer}</div>
                `;
                errorItems.appendChild(errorItem);
                
                message(`呜呜～答错了呢...正确答案是：${correctAnswer}`, "error");
            } else {
                message("喵～答对啦！虽然连接词顺序不同，但主人真棒！", "success");
            }
        }
        
        currentIndex++;
        updateProgressBar();
        displayNext();
    }

    // 显示下一题
    function displayNext() {
        if (currentIndex < qaPairs.length) {
            chineseText.textContent = qaPairs[currentIndex].chinese;
            answerInput.value = "";
            answerInput.focus();
            answerInput.disabled = false;
        } else {
            chineseText.textContent = isRetryMode ? 
                "喵～错题练习完成啦！" : 
                "喵喵～所有题目都完成啦！";
            
            answerInput.value = "";
            answerInput.disabled = true;
            
            if (isRetryMode) {
                if (wrongAnswers.length === 0) {
                    message("喵呜～太厉害了！主人把所有错题都改正啦！", "success");
                } else {
                    message(`呜喵～还有 ${wrongAnswers.length} 道题需要继续练习哦`, "warning");
                }
                isRetryMode = false;
            } else {
                const correctCount = qaPairs.length - wrongAnswers.length;
                const percentage = Math.round((correctCount / qaPairs.length) * 100);
                message(`喵～主人完成了所有题目！正确率: ${percentage}%，${percentage > 80 ? '真是太厉害了！' : '继续加油哦～'}`, "info");
            }
        }
    }

    // 重做错题
    retryBtn.addEventListener("click", function () {
        if (wrongAnswers.length === 0) {
            message("喵～没有错题需要重做呢，主人太厉害啦！", "warning");
            return;
        }

        isRetryMode = true;
        currentIndex = 0;
        qaPairs = [...wrongAnswers]; // 复制错题数组
        wrongAnswers = []; // 清空错题数组
        errorItems.innerHTML = ""; // 清空错题列表
        
        updateProgressBar();
        displayNext();
        message("喵～开始练习错题啦！主人加油哦～", "info");
    });

    // 导出错题
    exportBtn.addEventListener("click", function () {
        if (wrongAnswers.length === 0) {
            message("喵呜～没有错题可以导出呢", "warning");
            return;
        }

        try {
            // 使用docx库
            const { Document, Paragraph, TextRun, Packer } = docx;

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: wrongAnswers.map(qa => {
                        // 处理高亮部分
                        const parts = qa.highlightedAnswer.split(/<span class="highlight">|<\/span>/);
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
            Packer.toBlob(doc).then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${currentFileName}错题集.docx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                message("喵～错题导出成功啦！可以回去好好复习哦～", "success");
            });
        } catch (error) {
            console.error('导出错题时出错:', error);
            message("呜呜～导出错题时出错了呢", "error");
        }
    });

    // 事件监听
    submitBtn.addEventListener("click", handleSubmit);
    
    answerInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSubmit();
        }
    });
    
    // 切换暗色/亮色模式
    document.getElementById("theme-toggle").addEventListener("click", function() {
        document.documentElement.classList.toggle('dark');
    });

    // 初始化
    initFileSelector();
});