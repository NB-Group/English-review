const unitData = {
  "title": "八年级下册 Unit 2 Reading",
  "vocabulary": [
    {
      "english": ["amazing digital technologies"],
      "chinese": "令人惊叹的数字技术"
    },
    {
      "english": ["make life a lot easier for the disabled"],
      "chinese": "使残疾人的生活便利许多"
    },
    {
      "english": ["a new type of smart walking stick"],
      "chinese": "一种新型智能拐杖"
    },
    {
      "english": ["warn the blind of danger nearby"],
      "chinese": "提醒盲人附近的危险"
    },
    {
      "english": ["as soon as"],
      "chinese": "一...就"
    },
    {
      "english": ["get close"],
      "chinese": "靠近"
    },
    {
      "english": ["warn sb. of the danger"],
      "chinese": "警告某人有危险"
    },
    {
      "english": ["give directions"],
      "chinese": "指明方向"
    },
    {
      "english": ["inform its owner of/about sth."],
      "chinese": "通知它的主人某事"
    },
    {
      "english": ["train timetables"],
      "chinese": "火车时刻表"
    },
    {
      "english": ["It is believed that..."],
      "chinese": "据信"
    },
    {
      "english": ["make it easy to share knowledge"],
      "chinese": "使分享知识变得容易"
    },
    {
      "english": ["no matter where they live", "wherever they live"],
      "chinese": "无论他们住在哪里"
    },
    {
      "english": ["according to"],
      "chinese": "根据"
    },
    {
      "english": ["What is the population of...?"],
      "chinese": "...的人口是多少？"
    },
    {
      "english": ["in rural areas"],
      "chinese": "在农村地区"
    },
    {
      "english": ["to change the situation"],
      "chinese": "为了改变这一状况"
    },
    {
      "english": ["be provided with a powerful internet connection"],
      "chinese": "被提供高速互联网连接"
    },
    {
      "english": ["provide sb. with sth.", "provide sth. for sb."],
      "chinese": "为某人提供某物"
    },
    {
      "english": ["have a chance to learn"],
      "chinese": "拥有学习的机会"
    },
    {
      "english": ["enjoy wonderful online lessons"],
      "chinese": "享受精彩的在线课程"
    },
    {
      "english": ["firefighting robots"],
      "chinese": "消防机器人"
    },
    {
      "english": ["communicate with..."],
      "chinese": "与。。。交流"
    },
    {
      "english": ["people caught in a fire"],
      "chinese": "火灾中的人们"
    },
    {
      "english": ["be caught in"],
      "chinese": "陷入困境"
    },
    {
      "english": ["move around"],
      "chinese": "四处走动"
    },
    {
      "english": ["In this way"],
      "chinese": "通过这种方式"
    },
    {
      "english": ["send video information to the control unit"],
      "chinese": "向消防控制室发送视频信息"
    },
    {
      "english": ["enable sb. to do sth."],
      "chinese": "使某人能够做某事"
    },
    {
      "english": ["do part of the dangerous work"],
      "chinese": "承担部分危险工作"
    },
    {
      "english": ["work under difficult conditions"],
      "chinese": "在艰难条件下工作"
    },
    {
      "english": ["Robots can really be a great help in dangerous situations."],
      "chinese": "机器人在危险情况下确实可以提供很大帮助"
    }
  ],
  "wordForms": [
    {
      "word": "able",
      "forms": [
        { "type": "adjective", "chinese": "能够的", "form": "able" },
        { "type": "negative", "chinese": "不能够的", "form": "unable" },
        { "type": "related", "chinese": "残疾的", "form": "disabled" },
        { "type": "noun", "chinese": "能力", "form": "ability" },
        { "type": "verb", "chinese": "使。。。能", "form": "enable" }
      ]
    },
    {
      "word": "warn",
      "forms": [
        { "type": "verb", "chinese": "警告", "form": "warn" },
        { "type": "noun", "chinese": "警告", "form": "warning" }
      ]
    },
    {
      "word": "detect",
      "forms": [
        { "type": "verb", "chinese": "发现、侦查", "form": "detect" },
        { "type": "noun", "chinese": "侦查、探测", "form": "detection" },
        { "type": "noun", "chinese": "侦探", "form": "detective" }
      ]
    },
    {
      "word": "object",
      "forms": [
        { "type": "noun", "chinese": "物体、宾语", "form": "object" },
        { "type": "verb", "chinese": "不赞成", "form": "object" }
      ]
    },
    {
      "word": "direction",
      "forms": [
        { "type": "noun", "chinese": "方向", "form": "direction" },
        { "type": "verb", "chinese": "给...指路，指示", "form": "direct" },
        { "type": "adjective", "chinese": "直接的", "form": "direct" }
      ]
    },
    {
      "word": "inform",
      "forms": [
        { "type": "verb", "chinese": "通知", "form": "inform" },
        { "type": "noun", "chinese": "信息", "form": "information" }
      ]
    },
    {
      "word": "rural",
      "forms": [
        { "type": "adjective", "chinese": "乡村的", "form": "rural" },
        { "type": "adjective", "chinese": "城市的", "form": "urban" },
        { "type": "noun", "chinese": "郊区", "form": "suburb" },
        { "type": "adjective", "chinese": "郊区的", "form": "suburban" }
      ]
    },
    {
      "word": "firefighting",
      "forms": [
        { "type": "noun", "chinese": "灭火", "form": "firefighting" },
        { "type": "noun", "chinese": "消防员", "form": "firefighter" }
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
