const unitData = {
  "title": "八年级下册 Unit 3 Speaking",
  "vocabulary": [
    {
      "english": ["list some special things they did"],
      "chinese": "罗列他们做到特殊的事"
    },
    {
      "english": ["What's special about"],
      "chinese": "。。。有什么特别之处?"
    },
    {
      "english": ["seem to do"],
      "chinese": "似乎做某事"
    },
    {
      "english": ["it seems that"],
      "chinese": "似乎。。。"
    },
    {
      "english": ["seem"],
      "chinese": "似乎。。。"
    },
    {
      "english": ["the answer to the question"],
      "chinese": "这个问题的回答"
    },
    {
      "english": ["The more I read, the more I wanted to find out."],
      "chinese": "我读得越多，我想发现的就越多。"
    },
    {
      "english": ["Any good books to recommend?"],
      "chinese": "有什么好书推荐吗？"
    },
    {
      "english": ["recommend sth to sb.", "recommend sb. sth."],
      "chinese": "向某人推荐某物"
    },
    {
      "english": ["recommend sb. to do sth."],
      "chinese": "推荐某人做某事"
    },
    {
      "english": ["tons of books"],
      "chinese": "几吨书"
    },
    {
      "english": ["ruin your eyesight"],
      "chinese": "毁坏视力"
    },
    {
      "english": ["That's why we have two eyes instead of one."],
      "chinese": "那就是为什么我们有两只眼睛而不是一只"
    },
    {
      "english": ["take all the metro lines around the city"],
      "chinese": "乘坐城市所有的地铁"
    },
    {
      "english": ["watch videos about metro system"],
      "chinese": "观看有关地铁系统的视频"
    },
    {
      "english": ["watch ants and train dogs"],
      "chinese": "观看蚂蚁和训练狗"
    },
    {
      "english": ["how washing machines work"],
      "chinese": "洗衣机如何运作"
    },
    {
      "english": ["join a young engineer camp"],
      "chinese": "参加少年工程师营地"
    },
    {
      "english": ["pretty good", "good for you", "well done", "good job"],
      "chinese": "干得好"
    },
    {
      "english": ["That's great!", "fantastic"],
      "chinese": "太棒了"
    },
    {
      "english": ["I'm proud of you."],
      "chinese": "我为你骄傲"
    },
    {
      "english": ["You are so talented.", "You have a talent for this."],
      "chinese": "你太有天份啦"
    },
    {
      "english": ["You are making a difference."],
      "chinese": "你正在产生影响/引起改变"
    },
    {
      "english": ["stay awake"],
      "chinese": "保持清醒"
    },
    {
      "english": ["an eagle"],
      "chinese": "一只老鹰"
    },
    {
      "english": ["a touching cartoon movie they both watched"],
      "chinese": "我们都看过的一部感人的卡通电影"
    }
  ],
  "wordForms": [
    {
      "word": "ruin",
      "forms": [
        { "type": "noun", "chinese": "废墟", "form": "ruin" },
        { "type": "verb", "chinese": "破坏", "form": "ruin" }
      ]
    },
    {
      "word": "proud",
      "forms": [
        { "type": "adjective", "chinese": "骄傲的", "form": "proud" },
        { "type": "noun", "chinese": "骄傲", "form": "pride" }
      ]
    },
    {
      "word": "fantastic",
      "forms": [
        { "type": "adjective", "chinese": "极好的", "form": "fantastic" },
        { "type": "noun", "chinese": "幻想", "form": "fantasy" }
      ]
    },
    {
      "word": "recommend",
      "forms": [
        { "type": "verb", "chinese": "推荐", "form": "recommend" },
        { "type": "noun", "chinese": "推荐", "form": "recommendation" }
      ]
    },
    {
      "word": "surprise",
      "forms": [
        { "type": "noun", "chinese": "惊讶", "form": "surprise" },
        { "type": "adjective", "chinese": "惊讶的（物）", "form": "surprising" },
        { "type": "adjective", "chinese": "惊讶的（人）", "form": "surprised" }
      ]
    },
    {
      "word": "excite",
      "forms": [
        { "type": "verb", "chinese": "兴奋", "form": "excite" },
        { "type": "adjective", "chinese": "兴奋的（人）", "form": "excited" },
        { "type": "adjective", "chinese": "兴奋的（物）", "form": "exciting" }
      ]
    },
    {
      "word": "wake",
      "forms": [
        { "type": "verb", "chinese": "醒来", "form": "wake" },
        { "type": "verb", "chinese": "醒来（过去式）", "form": "woke" },
        { "type": "verb", "chinese": "醒来（过去分词）", "form": "woken" }
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

