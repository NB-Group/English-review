const unitData = {
  "title": "八年级下册 Unit 1 viewing and listening",
  "vocabulary": [
    {
      "english": ["be important to", "be crucial to"],
      "chinese": "对。。。重要"
    },
    {
      "english": ["learn about water facts", "learn facts about water"],
      "chinese": "学习水的事实"
    },
    {
      "english": ["water on earth"],
      "chinese": "地球上的水"
    },
    {
      "english": ["the earth"],
      "chinese": "地球，陆地，泥土"
    },
    {
      "english": ["on earth", "in the world"],
      "chinese": "在世界上"
    },
    {
      "english": ["What on earth are you doing?"],
      "chinese": "你究竟要做什么？"
    },
    {
      "english": ["lock up in ice or deep underground"],
      "chinese": "锁在冰和地底中"
    },
    {
      "english": ["take in"],
      "chinese": "吸收"
    },
    {
      "english": ["give out"],
      "chinese": "释放"
    },
    {
      "english": ["drips of water", "drops of water"],
      "chinese": "水滴"
    },
    {
      "english": ["fresh water", "drinking water"],
      "chinese": "饮用水"
    },
    {
      "english": ["sea water", "salty water"],
      "chinese": "海水"
    },
    {
      "english": ["two point seven liters", "two point seven milliliters"],
      "chinese": "2.7升/毫升"
    },
    {
      "english": ["one half"],
      "chinese": "1/2"
    },
    {
      "english": ["a quarter"],
      "chinese": "四分之一"
    },
    {
      "english": ["three quarters"],
      "chinese": "四分之三"
    },
    {
      "english": ["two thirds"],
      "chinese": "2/3"
    },
    {
      "english": ["two billion", "two million", "two percent"],
      "chinese": "20亿/ 2 百万/ 2%"
    },
    {
      "english": ["70% of the Earth's surface"],
      "chinese": "70% 地球表面"
    },
    {
      "english": ["the rest"],
      "chinese": "剩余"
    },
    {
      "english": ["most of the fresh water we can reach"],
      "chinese": "我们可获得的大多数淡水"
    },
    {
      "english": ["safely managed drinking water"],
      "chinese": "安全管理的饮用水"
    },
    {
      "english": ["believe it or not"],
      "chinese": "信不信由你"
    },
    {
      "english": ["rarely", "hardly", "seldom"],
      "chinese": "几乎不"
    },
    {
      "english": ["water cycle"],
      "chinese": "水循环"
    }
  ],
  "wordForms": [
    {
      "word": "salty",
      "forms": [
        { "type": "adjective", "chinese": "咸的", "form": "salty" },
        { "type": "noun", "chinese": "盐", "form": "salt" }
      ]
    },
    {
      "word": "lock",
      "forms": [
        { "type": "verb", "chinese": "上锁", "form": "lock" },
        { "type": "noun", "chinese": "储物柜", "form": "locker" }
      ]
    },
    {
      "word": "rare",
      "forms": [
        { "type": "adjective", "chinese": "稀有的", "form": "rare" },
        { "type": "adverb", "chinese": "稀有地、几乎不", "form": "rarely" }
      ]
    },
    {
      "word": "drip",
      "forms": [
        { "type": "verb", "chinese": "滴水", "form": "drip" },
        { "type": "verb", "chinese": "正在滴水", "form": "dripping" },
        { "type": "verb", "chinese": "滴水（过去式）", "form": "dripped" }
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

