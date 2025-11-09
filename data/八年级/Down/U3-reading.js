const unitData = {
  "title": "八年级下册 Unit 3 Reading",
  "vocabulary": [
    {
      "english": ["the power of curiosity"],
      "chinese": "好奇心的力量"
    },
    {
      "english": ["seem never-ending"],
      "chinese": "似乎永无止境"
    },
    {
      "english": ["be important for the growing mind"],
      "chinese": "对成长的大脑很重要"
    },
    {
      "english": ["take in new information"],
      "chinese": "吸收新的信息"
    },
    {
      "english": ["rate one's curiosity about"],
      "chinese": "评估某人对。。。的好奇度"
    },
    {
      "english": ["do a research", "conduct a research"],
      "chinese": "做一个调查研究"
    },
    {
      "english": ["Results showed that"],
      "chinese": "结果显示"
    },
    {
      "english": ["as a result"],
      "chinese": "作为结果"
    },
    {
      "english": ["be more likely to do"],
      "chinese": "更有可能做某事"
    },
    {
      "english": ["lead to sth."],
      "chinese": "导致"
    },
    {
      "english": ["lead sb. to do sth."],
      "chinese": "带领某人做某事"
    },
    {
      "english": ["design their own magic tricks"],
      "chinese": "设计他们自己的魔术把戏"
    },
    {
      "english": ["in a recent experiment"],
      "chinese": "在最近的实验中"
    },
    {
      "english": ["It turned out to be", "It turned out"],
      "chinese": "结果证明是。。。"
    },
    {
      "english": ["come up with an idea", "think of an idea"],
      "chinese": "想到一个主意"
    },
    {
      "english": ["encourage voluntary learning"],
      "chinese": "鼓励自发性学习"
    },
    {
      "english": ["discover career interests"],
      "chinese": "发现职业兴趣"
    },
    {
      "english": ["be crazy about"],
      "chinese": "对。。。疯狂"
    },
    {
      "english": ["do simple repairs"],
      "chinese": "做一些简单的维修"
    },
    {
      "english": ["a leading heart doctor"],
      "chinese": "一位杰出的心脏科医生"
    },
    {
      "english": ["how the human body worked"],
      "chinese": "人类身体如何运作"
    },
    {
      "english": ["go into it deeply"],
      "chinese": "深入研究它"
    },
    {
      "english": ["keep a curious mind"],
      "chinese": "保持好奇心"
    },
    {
      "english": ["therefore"],
      "chinese": "所以"
    }
  ],
  "wordForms": [
    {
      "word": "annoy",
      "forms": [
        { "type": "verb", "chinese": "使烦恼", "form": "annoy" },
        { "type": "adjective", "chinese": "恼人的", "form": "annoying" },
        { "type": "adjective", "chinese": "感到烦人的", "form": "annoyed" }
      ]
    },
    {
      "word": "research",
      "forms": [
        { "type": "noun", "chinese": "研究者", "form": "researcher" },
        { "type": "noun", "chinese": "研究", "form": "research" },
        { "type": "verb", "chinese": "研究", "form": "research" }
      ]
    },
    {
      "word": "like",
      "forms": [
        { "type": "verb", "chinese": "喜欢", "form": "like" },
        { "type": "preposition", "chinese": "像", "form": "like" },
        { "type": "verb", "chinese": "不喜欢", "form": "dislike" },
        { "type": "preposition", "chinese": "不像", "form": "unlike" },
        { "type": "adjective", "chinese": "可能的", "form": "likely" }
      ]
    },
    {
      "word": "lead",
      "forms": [
        { "type": "verb", "chinese": "带领", "form": "lead" },
        { "type": "noun", "chinese": "领导", "form": "leader" },
        { "type": "adjective", "chinese": "主要的，重要的", "form": "leading" }
      ]
    },
    {
      "word": "magic",
      "forms": [
        { "type": "adjective", "chinese": "魔术", "form": "magic" },
        { "type": "noun", "chinese": "魔术师", "form": "magician" }
      ]
    },
    {
      "word": "voluntary",
      "forms": [
        { "type": "adjective", "chinese": "主动的，志愿的", "form": "voluntary" },
        { "type": "noun", "chinese": "自愿者", "form": "volunteer" },
        { "type": "verb", "chinese": "自愿做", "form": "volunteer" },
        { "type": "adverb", "chinese": "自愿地", "form": "voluntarily" }
      ]
    },
    {
      "word": "deep",
      "forms": [
        { "type": "adjective", "chinese": "深的", "form": "deep" },
        { "type": "adverb", "chinese": "深深地", "form": "deeply" }
      ]
    },
    {
      "word": "impress",
      "forms": [
        { "type": "verb", "chinese": "使留下印象深刻", "form": "impress" },
        { "type": "adjective", "chinese": "感到印象深刻", "form": "impressed" },
        { "type": "adjective", "chinese": "印象深刻的", "form": "impressive" },
        { "type": "noun", "chinese": "印象", "form": "impression" }
      ]
    },
    {
      "word": "recent",
      "forms": [
        { "type": "adjective", "chinese": "最近的", "form": "recent" },
        { "type": "adverb", "chinese": "最近", "form": "recently" }
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

