/**
 * AI判题器
 * 使用SiliconFlow API进行智能判题
 */

export class AIGrader {
    constructor() {
        this.apiUrl = 'https://api.siliconflow.cn/v1/chat/completions';
        this.settings = {
            apiKey: '',
            aiModel: 'Qwen/Qwen2.5-7B-Instruct',
            enableAIGrading: false
        };
    }
    
    /**
     * 更新设置
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }
    
    /**
     * AI判题
     */
    async gradeAnswer(question, userAnswer, settings = null) {
        const config = settings || this.settings;
        
        if (!config.apiKey) {
            throw new Error('API Key未设置');
        }
        
        if (!config.enableAIGrading) {
            throw new Error('AI判题未启用');
        }
        
        try {
            const prompt = this.buildPrompt(question, userAnswer);
            const response = await this.callAPI(prompt, config);
            return this.parseResponse(response);
        } catch (error) {
            console.error('AI判题失败:', error);
            throw error;
        }
    }
    
    /**
     * 构建提示词
     */
    buildPrompt(question, userAnswer) {
        const correctAnswers = Array.isArray(question.english) ? question.english : [question.english];

        return `请判断以下英语翻译是否正确：

中文: ${question.chinese}
标准答案: ${correctAnswers.join(' 或 ')}
学生答案: ${userAnswer}

判题要求：
1. 重点判断意思是否正确，语法和用词可以有小瑕疵
2. 忽略大小写、单复数、冠词等细微差异（如：cat 和 cats 都算对，Cat 和 CAT 都算对）
3. 只要能传达基本相同的意思就判为正确
4. 如果答案正确，请输出：True{标准答案}
5. 如果答案错误，请输出：False{错误简短分析}（分析不超过10个字）

判题标准：
- 意思基本相同：输出 True{标准答案}
- 语法有错误但意思对：输出 True{标准答案}
- 用词不当但意思对：输出 True{标准答案}
- 意思完全错误：输出 False{具体错误分析}

请直接输出 True{标准答案} 或 False{错误分析}，不要其他内容。`;
    }
    
    /**
     * 调用API
     */
    async callAPI(prompt, config) {
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.aiModel,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 500
            })
        };
        
        const response = await fetch(this.apiUrl, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API调用失败: ${response.status} ${response.statusText} - ${errorData.error?.message || '未知错误'}`);
        }
        
        const data = await response.json();
        return data;
    }
    
    /**
     * 解析API响应
     */
    parseResponse(response) {
        try {
            if (!response.choices || response.choices.length === 0) {
                throw new Error('API响应格式错误');
            }
            
            const content = response.choices[0].message.content.trim();

            // 尝试解析新的格式：True 或 False{错误分析}
            let result = this.parseNewFormat(content);

            // 如果新格式解析失败，回退到旧格式
            if (!result) {
                // 尝试解析JSON
                try {
                    result = JSON.parse(content);
                } catch (jsonError) {
                    // 如果不是标准JSON，尝试提取关键信息
                    result = this.extractFromText(content);
                }

                // 验证结果格式
                if (typeof result.isCorrect !== 'boolean') {
                    result.isCorrect = this.guessCorrectness(content);
                }

                if (!result.feedback) {
                    result.feedback = result.isCorrect ? '对' : '错: 答案不正确';
                }

                // 确保反馈格式正确
                if (result.isCorrect && !result.feedback.startsWith('对')) {
                    result.feedback = '对';
                } else if (!result.isCorrect && !result.feedback.startsWith('错:')) {
                    result.feedback = '错: 答案不正确';
                }
            }

            return result;
        } catch (error) {
            console.error('解析AI响应失败:', error);
            throw new Error('AI响应解析失败');
        }
    }
    
    /**
     * 解析新的格式：True{标准答案} 或 False{错误分析}
     */
    parseNewFormat(content) {
        const trimmedContent = content.trim();

        // 检查是否为 True{标准答案} 格式
        if (trimmedContent.startsWith('True{') && trimmedContent.endsWith('}')) {
            const correctAnswer = trimmedContent.substring(5, trimmedContent.length - 1).trim();
            return {
                isCorrect: true,
                feedback: `对: ${correctAnswer}`,
                score: 100
            };
        }

        // 检查是否为 False{错误分析} 格式
        if (trimmedContent.startsWith('False{') && trimmedContent.endsWith('}')) {
            const errorAnalysis = trimmedContent.substring(6, trimmedContent.length - 1).trim();
            return {
                isCorrect: false,
                feedback: `错: ${errorAnalysis}`,
                score: 0
            };
        }

        // 如果不是新格式，返回null让旧逻辑处理
        return null;
    }

    /**
     * 从文本中提取判题信息
     */
    extractFromText(text) {
        // 首先尝试解析新格式
        const newFormatResult = this.parseNewFormat(text);
        if (newFormatResult) {
            return newFormatResult;
        }

        const result = {
            isCorrect: false,
            feedback: text,
            score: 0
        };

        // 检查是否包含正确的关键词
        const correctKeywords = ['对', '正确', 'correct', 'true', '✓'];
        const incorrectKeywords = ['错', '错误', 'incorrect', 'false', '✗'];

        const lowerText = text.toLowerCase();

        if (correctKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
            result.isCorrect = true;
            result.score = 80;
            result.feedback = '对';
        } else if (incorrectKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
            result.isCorrect = false;
            result.score = 0;
            result.feedback = text.includes(':') ? text : '错: 答案不正确';
        }

        // 尝试提取分数
        const scoreMatch = text.match(/(\d+)分|(\d+)%|score[:\s]*(\d+)/i);
        if (scoreMatch) {
            const score = parseInt(scoreMatch[1] || scoreMatch[2] || scoreMatch[3]);
            if (score >= 0 && score <= 100) {
                result.score = score;
                result.isCorrect = score >= 60;
            }
        }

        return result;
    }
    
    /**
     * 猜测正确性
     */
    guessCorrectness(text) {
        const correctCount = (text.match(/正确|对|correct|true|✓/gi) || []).length;
        const incorrectCount = (text.match(/错误|错|incorrect|false|✗/gi) || []).length;
        
        return correctCount > incorrectCount;
    }
    
    /**
     * 生成备用反馈
     */
    generateFallbackFeedback(isCorrect, score) {
        if (isCorrect) {
            return '对';
        } else {
            return '错: 答案不正确';
        }
    }
    
    /**
     * 测试API连接
     */
    async testConnection(apiKey, model = 'Qwen/Qwen3-8B') {
        try {
            const options = {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'user',
                            content: '请回复"连接成功"'
                        }
                    ],
                    max_tokens: 10
                })
            };
            
            const response = await fetch(this.apiUrl, options);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    message: '连接成功',
                    response: data
                };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: `连接失败: ${response.status} ${errorData.error?.message || '未知错误'}`
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `连接失败: ${error.message}`
            };
        }
    }
    
    /**
     * 获取支持的模型列表
     */
    getSupportedModels() {
        return [
            { value: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B-Instruct (推荐)' },
            { value: 'Qwen/Qwen3-8B', label: 'Qwen3-8B' },
            { value: 'Qwen/Qwen2-7B', label: 'Qwen2-7B' },
            { value: 'meta-llama/Llama-3-8B-Instruct', label: 'Llama-3-8B-Instruct' }
        ];
    }
}
