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

// 新增全局常量：本地存储键名
const STORAGE_KEYS = {
    POMODORO_CONFIG: 'english_review_pomodoro_config',
    POMODORO_STATE: 'english_review_pomodoro_state',
    WRONG_ANSWERS: 'english_review_wrong_answers',
    CURRENT_FILE: 'english_review_current_file'
};

// 番茄时钟状态
const pomodoroState = {
    isActive: false,
    isPaused: false,
    isBreak: false,
    studyMinutes: 25,
    breakMinutes: 5,
    remainingSeconds: 0,
    timerId: null,
    lastUpdate: Date.now() // 新增：最后更新时间戳
};

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
        catgirlText = text.replace("完成啦喵～");
    } else if (text.match(/^回答正确/)) {
        catgirlText = "喵呜～答对啦！真是太厉害了～";
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
    
    // 番茄时钟元素
    const pomodoroModal = document.getElementById("pomodoro-modal");
    const pomodoroBtn = document.getElementById("pomodoro-button");
    const closeModal = document.querySelector(".close-modal");
    const startPomodoroBtn = document.getElementById("start-pomodoro");
    const studyTimeInput = document.getElementById("study-time");
    const breakTimeInput = document.getElementById("break-time");
    const timerContainer = document.getElementById("pomodoro-timer");
    const timerCountdown = document.getElementById("timer-countdown");
    const timerStatus = document.getElementById("timer-status");
    const pauseTimerBtn = document.getElementById("pause-timer");
    const stopTimerBtn = document.getElementById("stop-timer");
    
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

    // 保存番茄时钟配置到本地存储
    function savePomodoroConfig() {
        const config = {
            studyMinutes: pomodoroState.studyMinutes,
            breakMinutes: pomodoroState.breakMinutes
        };
        localStorage.setItem(STORAGE_KEYS.POMODORO_CONFIG, JSON.stringify(config));
    }

    // 保存番茄时钟状态到本地存储
    function savePomodoroState() {
        const stateToSave = {
            isActive: pomodoroState.isActive,
            isPaused: pomodoroState.isPaused,
            isBreak: pomodoroState.isBreak,
            remainingSeconds: pomodoroState.remainingSeconds,
            lastUpdate: Date.now()
        };
        localStorage.setItem(STORAGE_KEYS.POMODORO_STATE, JSON.stringify(stateToSave));
    }

    // 保存错题列表和当前文件名
    function saveWrongAnswers() {
        localStorage.setItem(STORAGE_KEYS.WRONG_ANSWERS, JSON.stringify(wrongAnswers));
        localStorage.setItem(STORAGE_KEYS.CURRENT_FILE, currentFileName);
    }

    // 恢复番茄时钟配置
    function restorePomodoroConfig() {
        const savedConfig = localStorage.getItem(STORAGE_KEYS.POMODORO_CONFIG);
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                pomodoroState.studyMinutes = config.studyMinutes || 25;
                pomodoroState.breakMinutes = config.breakMinutes || 5;
                
                // 更新输入框值
                studyTimeInput.value = pomodoroState.studyMinutes;
                breakTimeInput.value = pomodoroState.breakMinutes;
                
                message("喵～成功恢复了你的番茄时钟设置", "info");
            } catch (e) {
                console.error("恢复番茄时钟配置出错:", e);
            }
        }
    }

    // 恢复番茄时钟状态
    function restorePomodoroState() {
        const savedState = localStorage.getItem(STORAGE_KEYS.POMODORO_STATE);
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                
                // 如果保存的状态是活跃的
                if (state.isActive) {
                    // 计算经过的时间
                    const elapsedSeconds = Math.floor((Date.now() - state.lastUpdate) / 1000);
                    let remainingSeconds = state.remainingSeconds - elapsedSeconds;
                    
                    // 如果番茄钟已经过期，不恢复状态
                    if (remainingSeconds <= 0) {
                        message("喵～你之前的番茄时钟已经结束了～", "info");
                        return;
                    }
                    
                    // 恢复状态
                    pomodoroState.isActive = true;
                    pomodoroState.isPaused = state.isPaused;
                    pomodoroState.isBreak = state.isBreak;
                    pomodoroState.remainingSeconds = remainingSeconds;
                    
                    // 更新显示并启动计时器
                    updateTimerDisplay();
                    startTimer();
                    
                    // 显示计时器
                    timerContainer.style.display = "flex";
                    
                    message(`喵～恢复了你的${state.isBreak ? "休息" : "学习"}时间～`, "success");
                }
            } catch (e) {
                console.error("恢复番茄时钟状态出错:", e);
            }
        }
    }

    // 恢复错题列表
    function restoreWrongAnswers() {
        const savedWrongAnswers = localStorage.getItem(STORAGE_KEYS.WRONG_ANSWERS);
        const savedFileName = localStorage.getItem(STORAGE_KEYS.CURRENT_FILE);
        
        if (savedWrongAnswers && savedFileName) {
            try {
                wrongAnswers = JSON.parse(savedWrongAnswers);
                currentFileName = savedFileName;
                
                // 仅在有错题时恢复
                if (wrongAnswers.length > 0) {
                    // 恢复错题列表显示
                    errorItems.innerHTML = "";
                    wrongAnswers.forEach(qa => {
                        const errorItem = document.createElement("li");
                        errorItem.className = "error-item";
                        errorItem.innerHTML = `
                            <div class="error-chinese">${qa.chinese}</div>
                            <div class="error-correct">正确: ${qa.highlightedAnswer}</div>
                            <div class="error-user">你的答案: ${qa.userAnswer}</div>
                        `;
                        errorItems.appendChild(errorItem);
                    });
                    
                    message(`喵～找到了你之前的${wrongAnswers.length}道错题哦～`, "info");
                }
            } catch (e) {
                console.error("恢复错题列表出错:", e);
            }
        }
    }

    // 初始化番茄时钟弹窗
    pomodoroBtn.addEventListener("click", function() {
        pomodoroModal.style.display = "block";
    });
    
    closeModal.addEventListener("click", function() {
        pomodoroModal.style.display = "none";
    });
    
    window.addEventListener("click", function(event) {
        if (event.target === pomodoroModal) {
            pomodoroModal.style.display = "none";
        }
    });
    
    // 格式化时间为 MM:SS
    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // 开始番茄时钟
    function startPomodoro() {
        const studyTime = parseInt(studyTimeInput.value) || 25;
        const breakTime = parseInt(breakTimeInput.value) || 5;
        
        pomodoroState.studyMinutes = studyTime;
        pomodoroState.breakMinutes = breakTime;
        pomodoroState.isActive = true;
        pomodoroState.isPaused = false;
        pomodoroState.isBreak = false;
        pomodoroState.remainingSeconds = studyTime * 60;
        
        // 保存配置
        savePomodoroConfig();
        savePomodoroState();
        
        updateTimerDisplay();
        startTimer();
        
        pomodoroModal.style.display = "none";
        timerContainer.style.display = "flex";
        message(`喵～番茄时钟开始啦！先学习 ${studyTime} 分钟哦`, "info");
    }
    
    // 更新计时器显示
    function updateTimerDisplay() {
        timerCountdown.textContent = formatTime(pomodoroState.remainingSeconds);
        timerStatus.textContent = pomodoroState.isBreak ? "休息中" : "学习中";
        timerContainer.className = "timer-container " + (pomodoroState.isBreak ? "break-mode" : "study-mode");
        
        // 保存状态到本地存储
        savePomodoroState();
    }
    
    // 开始计时器
    function startTimer() {
        // 清除已有计时器
        if (pomodoroState.timerId) {
            clearInterval(pomodoroState.timerId);
        }
        
        pomodoroState.timerId = setInterval(function() {
            if (pomodoroState.isPaused) return;
            
            pomodoroState.remainingSeconds--;
            updateTimerDisplay();
            
            if (pomodoroState.remainingSeconds <= 0) {
                // 时间到，切换模式
                pomodoroState.isBreak = !pomodoroState.isBreak;
                
                if (pomodoroState.isBreak) {
                    // 切换到休息模式
                    pomodoroState.remainingSeconds = pomodoroState.breakMinutes * 60;
                    message("喵～休息时间到啦！去伸展一下身体吧～", "success");
                    playNotificationSound();
                } else {
                    // 切换到学习模式
                    pomodoroState.remainingSeconds = pomodoroState.studyMinutes * 60;
                    message("喵～该学习啦！加油哦～", "info");
                    playNotificationSound();
                }
                
                updateTimerDisplay();
                savePomodoroState(); // 保存状态切换
            }
        }, 1000);
    }
    
    // 播放通知声音
    function playNotificationSound() {
        const audio = new Audio("data:audio/wav;base64,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Zgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
        audio.play();
    }
    
    // 暂停/恢复计时器
    pauseTimerBtn.addEventListener("click", function() {
        pomodoroState.isPaused = !pomodoroState.isPaused;
        savePomodoroState(); // 保存暂停状态
        message(pomodoroState.isPaused ? "喵～计时暂停啦" : "喵～计时继续啦", "info");
        pauseTimerBtn.textContent = pomodoroState.isPaused ? "▶️" : "⏯️"; 
    });
    
    // 停止计时器
    stopTimerBtn.addEventListener("click", function() {
        if (pomodoroState.isActive) {
            clearInterval(pomodoroState.timerId);
            pomodoroState.isActive = false;
            timerContainer.style.display = "none";
            savePomodoroState(); // 保存停止状态
            message("喵～番茄时钟已停止", "info");
        }
    });
    
    // 开始番茄时钟
    startPomodoroBtn.addEventListener("click", startPomodoro);

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
            wrongAnswers = []; // 清空错题列表
            errorItems.innerHTML = "";
            isRetryMode = false;
            
            updateProgressBar();
            displayNext();
            message(`喵～已加载"${selectedDoc}"，共${qaPairs.length}道题目等着你来解答喵！`, "success");
            
            // 加载新文档时，清空之前保存的错题
            localStorage.removeItem(STORAGE_KEYS.WRONG_ANSWERS);
        } else {
            message("呜呜～无法加载所选文档呢", "error");
        }
    });
    
    // Fisher-Yates 洗牌算法
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) { // 修复：将 i++ 改为 i--
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
        
        const correctAnswers = Array.isArray(qaPairs[currentIndex].english) 
            ? qaPairs[currentIndex].english 
            : [qaPairs[currentIndex].english];
        
        // 定义要忽略的词
        const ignoreWords = ["the", "a", "an"];

        // 移除括号及其内容
        const removeBrackets = (text) => {
            return text.replace(/\([^)]*\)/g, "").trim();
        };

        // 修改后的过滤函数：处理省略号和各种引号问题
        const filterAnswer = (text) => {
            const textWithoutBrackets = removeBrackets(text);
            
            // 完全移除所有省略号（不替换为空格）
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
        };

        // 检查任意一个正确答案是否匹配
        const isCorrect = correctAnswers.some(correctAnswer => 
            filterAnswer(userAnswer) === filterAnswer(correctAnswer)
        );

        // 检查是否有分隔的多个答案选项
        const checkSlashOptions = (userAnswerText) => {
            if (userAnswerText.includes("/")) {
                const options = userAnswerText.split("/").map(opt => opt.trim());
                return correctAnswers.some(correctAnswer => 
                    options.some(option => filterAnswer(option) === filterAnswer(correctAnswer))
                );
            }
            return false;
        };

        if (isCorrect || checkSlashOptions(userAnswer)) {
            message("喵呜～答对啦！真是太聪明了～", "success");
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

            // 检查任意一个正确答案与用户答案是否存在连接词调换
            const hasConnectedPhrases = correctAnswers.some(correctAnswer => 
                checkConnectedPhrases(userAnswer, correctAnswer)
            );

            if (hasConnectedPhrases) {
                message("喵～答对啦！虽然连接词顺序不同，但你真棒！", "success");
            } else {
                // 获取第一个正确答案用于显示和高亮
                const correctAnswer = correctAnswers[0];
                
                // 添加这行：将正确答案拆分为单词数组
                const correctWords = correctAnswer.split(" ");
                
                // 计算错误部分并高亮显示
                const highlightedAnswer = (() => {
                    // 创建用户词汇的频率映射
                    const userWordFreq = {};
                    // 规范化用户输入的单词
                    const normalizedUserWords = userAnswer.split(" ").map(word => {
                        // 统一处理省略号和单引号
                        return word.replace(/\.{3,}/g, '').replace(/[''′`]/g, "'");
                    });
                    
                    // 构建词频映射
                    normalizedUserWords.forEach(word => {
                        const normWord = filterAnswer(word);
                        if (normWord) { // 确保空字符串不被计入
                            userWordFreq[normWord] = (userWordFreq[normWord] || 0) + 1;
                        }
                    });
                    
                    // 标记正确答案中的单词
                    const result = correctWords.map(word => {
                        const normWord = filterAnswer(word);
                        
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
                })();

                // 添加到错题列表
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
                
                message(`呜呜～答错了呢...正确答案是：${correctAnswers.join(' 或 ')}`, "error");
            }
        }
        
        currentIndex++;
        updateProgressBar();
        displayNext();
        
        // 在添加错题后保存到本地存储
        saveWrongAnswers();
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
                    message("喵呜～太厉害了！把所有错题都改正啦！", "success");
                } else {
                    message(`呜喵～还有 ${wrongAnswers.length} 道题需要继续练习哦`, "warning");
                }
                isRetryMode = false;
            } else {
                const correctCount = qaPairs.length - wrongAnswers.length;
                const percentage = Math.round((correctCount / qaPairs.length) * 100);
                message(`喵～完成了所有题目！正确率: ${percentage}%，${percentage > 80 ? '真是太厉害了！' : '继续加油哦～'}`, "info");
            }
        }
    }

    // 重做错题
    retryBtn.addEventListener("click", function () {
        if (wrongAnswers.length === 0) {
            message("喵～没有错题需要重做呢，太厉害啦！", "warning");
            return;
        }

        isRetryMode = true;
        currentIndex = 0;
        qaPairs = [...wrongAnswers]; // 复制错题数组
        wrongAnswers = []; // 清空错题数组
        errorItems.innerHTML = ""; // 清空错题列表
        
        updateProgressBar();
        displayNext();
        message("喵～开始练习错题啦！加油哦～", "info");
        
        // 清空错题后保存到本地存储
        saveWrongAnswers();
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

    // 在页面加载时恢复状态
    function initializeFromLocalStorage() {
        restorePomodoroConfig();
        restorePomodoroState();
        restoreWrongAnswers();
    }

    // 初始化
    initFileSelector();
    initializeFromLocalStorage();

    // 窗口关闭前保存状态
    window.addEventListener('beforeunload', function() {
        savePomodoroState();
        saveWrongAnswers();
    });
});