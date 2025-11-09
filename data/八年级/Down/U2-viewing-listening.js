const unitData = {
  "title": "八年级下册 Unit 2 viewing and listening",
  "vocabulary": [
    {
      "english": ["How does digital technology influence our life?"],
      "chinese": "数码科技如何影响我们生活？"
    },
    {
      "english": ["have a great influence on", "have a great impact on"],
      "chinese": "对。。。产生巨大影响"
    },
    {
      "english": ["self-driving car"],
      "chinese": "自动驾驶车"
    },
    {
      "english": ["speech recognition"],
      "chinese": "语音识别"
    },
    {
      "english": ["robot waiter"],
      "chinese": "机器人服务员"
    },
    {
      "english": ["face recognition"],
      "chinese": "人脸识别"
    },
    {
      "english": ["3D printer"],
      "chinese": "3D打印机"
    },
    {
      "english": ["wearable device"],
      "chinese": "可穿戴设备"
    },
    {
      "english": ["AI customer service"],
      "chinese": "AI客服"
    },
    {
      "english": ["easy to carry around"],
      "chinese": "方便随身携带"
    },
    {
      "english": ["large screen"],
      "chinese": "大屏幕"
    },
    {
      "english": ["easy to type on"],
      "chinese": "在上面打字很便捷"
    },
    {
      "english": ["comfortable to wear"],
      "chinese": "佩戴舒适"
    },
    {
      "english": ["be easily paired with other devices"],
      "chinese": "可轻松与其他设备配对"
    },
    {
      "english": ["enjoy some private time"],
      "chinese": "享受一些私人时光"
    },
    {
      "english": ["have a powerful chip"],
      "chinese": "有强大的芯片"
    },
    {
      "english": ["thin and lightning fast"],
      "chinese": "轻薄和疾速如电"
    },
    {
      "english": ["easy to separate the keyboard and screen"],
      "chinese": "很容易将键盘和屏幕分开"
    },
    {
      "english": ["classic purple"],
      "chinese": "经典紫"
    },
    {
      "english": ["keep your information safe on the phone"],
      "chinese": "在手机上保持信息安全"
    },
    {
      "english": ["have four cameras on the back"],
      "chinese": "在背面有四个摄像头"
    },
    {
      "english": ["use the latest AI technology", "use the latest artificial intelligence technology"],
      "chinese": "运用最新的人工智能技术"
    },
    {
      "english": ["understand what you say easily"],
      "chinese": "很容易理解你说的话"
    },
    {
      "english": ["follow your orders", "obey your orders"],
      "chinese": "遵守你的命令"
    },
    {
      "english": ["keep an eye on your health", "take care of your health"],
      "chinese": "关注你的健康"
    },
    {
      "english": ["call the emergency services at once"],
      "chinese": "立即拨打紧急救援服务电话"
    }
  ],
  "wordForms": [
    {
      "word": "influence",
      "forms": [
        { "type": "noun", "chinese": "影响力", "form": "influence" },
        { "type": "verb", "chinese": "影响", "form": "influence" },
        { "type": "adjective", "chinese": "有影响力的", "form": "influential" }
      ]
    },
    {
      "word": "impact",
      "forms": [
        { "type": "noun", "chinese": "影响", "form": "impact" },
        { "type": "verb", "chinese": "影响", "form": "affect" }
      ]
    },
    {
      "word": "digital",
      "forms": [
        { "type": "adjective", "chinese": "数码的，数字式的", "form": "digital" },
        { "type": "noun", "chinese": "数字、数位", "form": "digit" }
      ]
    },
    {
      "word": "private",
      "forms": [
        { "type": "adjective", "chinese": "私人的", "form": "private" },
        { "type": "noun", "chinese": "隐私", "form": "privacy" },
        { "type": "adjective", "chinese": "公众的", "form": "public" }
      ]
    },
    {
      "word": "advantage",
      "forms": [
        { "type": "noun", "chinese": "优点、优势", "form": "advantage" },
        { "type": "noun", "chinese": "劣势", "form": "disadvantage" }
      ]
    },
    {
      "word": "health",
      "forms": [
        { "type": "noun", "chinese": "健康", "form": "health" },
        { "type": "adjective", "chinese": "健康的", "form": "healthy" },
        { "type": "adjective", "chinese": "不健康的", "form": "unhealthy" }
      ]
    },
    {
      "word": "serve",
      "forms": [
        { "type": "verb", "chinese": "服务", "form": "serve" },
        { "type": "noun", "chinese": "服务", "form": "service" },
        { "type": "noun", "chinese": "仆人", "form": "servant" }
      ]
    }
  ]
};

// 为了兼容动态导入和直接导入
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { unitData };
}
if (typeof window !== 'undefined') {
  window.unitData = unitData;
}

