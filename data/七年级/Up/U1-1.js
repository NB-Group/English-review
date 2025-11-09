const unitData = {
  "title": "七年级上册 Unit 1-1",
  "vocabulary": [
    {
      "english": ["a radio station"],
      "chinese": "一个电台"
    },
    {
      "english": ["a famous musician", "world-famous musician"],
      "chinese": "一位著名的音乐家"
    },
    {
      "english": ["play music during the lunch break"],
      "chinese": "在午休时间播放音乐"
    },
    {
      "english": ["collect music for this week's playlist"],
      "chinese": "为这周的播放清单收集音乐"
    },
    {
      "english": ["the best-known work"],
      "chinese": "最知名的作品"
    },
    {
      "english": ["download a song"],
      "chinese": "下载一首歌"
    },
    {
      "english": ["a folk song"],
      "chinese": "民歌"
    },
    {
      "english": ["classical music"],
      "chinese": "古典音乐"
    },
    {
      "english": ["praise the beauty of the jasmine flower"],
      "chinese": "赞扬茉莉花的美"
    },
    {
      "english": ["describe sth. to sb."],
      "chinese": "向某人描述某物"
    },
    {
      "english": ["the theme of a song"],
      "chinese": "歌曲的主题"
    },
    {
      "english": ["the title of a book"],
      "chinese": "书名"
    },
    {
      "english": ["write lyrics"],
      "chinese": "写歌词"
    },
    {
      "english": ["an unknown artist"],
      "chinese": "一位不知名的艺术家"
    },
    {
      "english": ["knock on the door", "knock at the door"],
      "chinese": "敲门"
    }
  ],
  "wordForms": [
    {
      "word": "music",
      "forms": [
        { "type": "noun", "chinese": "音乐", "form": "music" },
        { "type": "adjective", "chinese": "音乐的", "form": "musical" }
      ]
    },
    {
      "word": "beauty",
      "forms": [
        { "type": "noun", "chinese": "美；美丽", "form": "beauty" },
        { "type": "adjective", "chinese": "美丽的", "form": "beautiful" },
        { "type": "adverb", "chinese": "美丽地", "form": "beautifully" }
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
