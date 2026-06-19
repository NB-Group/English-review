const unitData = {
  "title": "八年级上册 Unit 5 Viewing and Listening",
  "vocabulary": [
    { "english": ["medical team"], "chinese": "医疗队" },
    { "english": ["school choir"], "chinese": "校合唱团" },
    { "english": ["volunteer group"], "chinese": "志愿者团体" },
    { "english": ["be a part of"], "chinese": "成为…中的一部分" },
    { "english": ["start a school band"], "chinese": "成立一个学校乐队" },
    { "english": ["do some research online"], "chinese": "在网上做了一些研究" },
    { "english": ["learn from other bands' experiences"], "chinese": "从其他乐队的经历中学习" },
    { "english": ["never let you down", "never make you disappointed"], "chinese": "永远不会让你失望" },
    { "english": ["a lead singer"], "chinese": "主唱" },
    { "english": ["The conversation shares the secrets of a great team."], "chinese": "他们的对话分享了一个伟大团队的秘密" },
    { "english": ["shared passion"], "chinese": "共同的激情" },
    { "english": ["have a passion for..."], "chinese": "热爱……" },
    { "english": ["Click to learn more if you are interested."], "chinese": "如果你感兴趣的话，点击了解更多信息。" },
    { "english": ["get so good"], "chinese": "变得很好" },
    { "english": ["help you stay together for so long"], "chinese": "帮你们在一起这么久" },
    { "english": ["pull all the members together"], "chinese": "把所有成员聚到一起" },
    { "english": ["greet the guest"], "chinese": "问候客人" },
    { "english": ["talk about their off-stage lives"], "chinese": "谈论他们的幕后生活" },
    { "english": ["one's role in the band"], "chinese": "某人在乐队中的角色" },
    { "english": ["play an important role in"], "chinese": "在某方面起到重要作用" },
    { "english": ["hold the band together"], "chinese": "使乐队团结在一起" },
    { "english": ["talk about their recent performance"], "chinese": "谈论他们最近的演出" },
    { "english": ["ASAP (as soon as possible)"], "chinese": "尽快" }
  ],
  "wordForms": [
    {
      "word": "medical",
      "forms": [
        { "type": "adjective", "form": "medical", "chinese": "医疗的" },
        { "type": "noun", "form": "medicine", "chinese": "药物" }
      ]
    },
    {
      "word": "lead",
      "forms": [
        { "type": "noun", "form": "lead", "chinese": "主角；领先地位" },
        { "type": "verb", "form": "lead", "chinese": "带路；引导" },
        { "type": "noun", "form": "leader", "chinese": "领导" },
        { "type": "adjective", "form": "leading", "chinese": "杰出的" }
      ]
    },
    {
      "word": "secret",
      "forms": [
        { "type": "noun", "form": "secret", "chinese": "秘密；秘诀" },
        { "type": "adjective", "form": "secret", "chinese": "秘密的" },
        { "type": "noun", "form": "secretary", "chinese": "秘书" }
      ]
    },
    {
      "word": "passion",
      "forms": [
        { "type": "noun", "form": "passion", "chinese": "酷爱；热衷的爱好" },
        { "type": "adjective", "form": "passionate", "chinese": "热诚的" }
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

