export interface WordItem {
  id: string;
  name: string;
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  aliases?: string[];
  note?: string;
  drawHint?: string; // 专为你画我猜半程提示
}

export const THEMES = [
  '水果',
  '动物',
  '食物',
  '日常物品',
  '植物',
  '人物和名人',
  '身边的人',
  '职业',
  '地点',
  '影视、动漫及游戏角色',
  '自定义主题',
] as const;

export type ThemeType = (typeof THEMES)[number];

export const WORD_BANK: WordItem[] = [
  // 1. 水果
  { id: 'fr1', name: '香蕉', theme: '水果', difficulty: 'easy', aliases: ['蕉'], note: '黄色弯弯的外表，剥皮即食软糯香甜', drawHint: '一种弯弯的黄色常见水果' },
  { id: 'fr2', name: '苹果', theme: '水果', difficulty: 'easy', aliases: ['红富士'], note: '红润脆甜，每天一个号称远离医生', drawHint: '一种圆圆的红色常用水果' },
  { id: 'fr3', name: '西瓜', theme: '水果', difficulty: 'easy', aliases: ['夏日西瓜'], note: '绿皮红瓤黑籽，夏天抱着用勺挖着吃的消暑神器', drawHint: '一种夏天必吃的绿皮红瓤大水果' },
  { id: 'fr4', name: '草莓', theme: '水果', difficulty: 'easy', aliases: ['红莓'], note: '心形红艳、表面布满细小芝麻籽的浆果', drawHint: '一种红艳长着小芝麻点的心形水果' },
  { id: 'fr5', name: '橙子', theme: '水果', difficulty: 'easy', aliases: ['甜橙'], note: '金黄多汁富含维C，需剥皮或切块食用', drawHint: '一种多汁的金黄色柑橘类水果' },
  { id: 'fr6', name: '榴莲', theme: '水果', difficulty: 'medium', aliases: ['水果之王'], note: '全身硬刺重铠，气味极其浓烈但口感如奶酪', drawHint: '一种长满硬刺、气味浓烈的热带水果之王' },
  { id: 'fr7', name: '百香果', theme: '水果', difficulty: 'medium', aliases: ['西番莲', '鸡蛋果'], note: '香气浓郁籽多酸爽，常泡蜂蜜果茶', drawHint: '一种酸甜多籽、常做果茶的紫皮水果' },
  { id: 'fr8', name: '牛油果', theme: '水果', difficulty: 'medium', aliases: ['鳄梨'], note: '果肉如黄油般绵滑，健康沙拉常驻主角', drawHint: '一种果肉如黄油般软滑的绿色沙拉水果' },
  { id: 'fr9', name: '山竹', theme: '水果', difficulty: 'medium', aliases: ['水果皇后'], note: '紫红厚硬外壳下包裹着如大蒜瓣般白嫩甜美的果肉', drawHint: '一种厚紫壳、白蒜瓣果肉的水果皇后' },
  { id: 'fr10', name: '无花果', theme: '水果', difficulty: 'medium', aliases: ['天生子'], note: '花朵隐藏在果实内部的甘甜软糯果品', drawHint: '一种看不到花朵直接结果的甘甜果子' },
  { id: 'fr11', name: '菠萝', theme: '水果', difficulty: 'easy', aliases: ['凤梨'], note: '外皮布满菱形鳞目，头顶绿冠酸甜解腻', drawHint: '一种头顶绿叶冠刺的黄色热带水果' },
  { id: 'fr12', name: '葡萄', theme: '水果', difficulty: 'easy', aliases: ['提子'], note: '一串串晶莹剔透，可酿葡萄酒', drawHint: '一种成串生长的紫红或翠绿小浆果' },

  // 2. 动物
  { id: 'an1', name: '大熊猫', theme: '动物', difficulty: 'easy', aliases: ['国宝', '大胖熊'], note: '中国国宝，黑白圆润喜欢懒洋洋啃竹子', drawHint: '一种黑白相间爱吃竹子的中国国宝' },
  { id: 'an2', name: '企鹅', theme: '动物', difficulty: 'easy', aliases: ['南极企鹅'], note: '身穿黑白燕尾服、在冰雪上摇摆行走的潜泳飞鸟', drawHint: '一种在南极冰雪上摇摇摆摆行走的鸟类' },
  { id: 'an3', name: '老虎', theme: '动物', difficulty: 'easy', aliases: ['百兽之王'], note: '额带王字条纹、威震山林的独居猫科猛兽', drawHint: '一种额头有王字纹的百兽之王' },
  { id: 'an4', name: '长颈鹿', theme: '动物', difficulty: 'easy', aliases: ['高个子'], note: '地球上最高的陆生哺乳动物，脖子极长', drawHint: '一种脖子极长的高大非洲动物' },
  { id: 'an5', name: '兔子', theme: '动物', difficulty: 'easy', aliases: ['小白兔'], note: '长耳朵红眼睛爱吃胡萝卜和青草', drawHint: '一种长耳朵三瓣嘴蹦蹦跳跳的小动物' },
  { id: 'an6', name: '猫咪', theme: '动物', difficulty: 'easy', aliases: ['猫', '小猫'], note: '会喵喵叫、踩奶抓老鼠的傲娇宠物', drawHint: '一种爱抓老鼠会喵喵叫的常见家宠' },
  { id: 'an7', name: '大象', theme: '动物', difficulty: 'easy', aliases: ['大长鼻子象'], note: '扇风大耳朵与灵活长鼻子，陆地体型庞然大物', drawHint: '一种拥有长长鼻子和大耳朵的陆地巨兽' },
  { id: 'an8', name: '树懒', theme: '动物', difficulty: 'medium', aliases: ['树獭'], note: '新陈代谢极慢，终年倒吊树上移动一步要花几分钟', drawHint: '一种动作极其迟缓、常年挂在树上的动物' },
  { id: 'an9', name: '袋鼠', theme: '动物', difficulty: 'easy', aliases: ['澳洲袋鼠'], note: '胸前有育儿袋、善于弹跳击警的澳洲代表动物', drawHint: '一种肚子上有育儿口袋、弹跳力极强的动物' },
  { id: 'an10', name: '变色龙', theme: '动物', difficulty: 'medium', aliases: ['避役'], note: '两只眼睛可独立转动，皮肤能随情绪和光线变幻色彩', drawHint: '一种能根据环境改变身体颜色的爬行动物' },

  // 3. 食物
  { id: 'fd1', name: '火锅', theme: '食物', difficulty: 'easy', aliases: ['麻辣火锅'], note: '红汤清汤沸腾翻滚，大家围坐涮肥牛毛肚', drawHint: '一种围坐在一起沸水涮菜涮肉的中华美食' },
  { id: 'fd2', name: '饺子', theme: '食物', difficulty: 'easy', aliases: ['水饺'], note: '逢年过节必吃，元宝造型薄皮大馅', drawHint: '一种像小元宝一样的传统面食' },
  { id: 'fd3', name: '汉堡包', theme: '食物', difficulty: 'easy', aliases: ['汉堡'], note: '两片圆面包中间夹着厚实肉饼和生菜酱料', drawHint: '一种夹着肉饼和生菜的两层圆面包' },
  { id: 'fd4', name: '炸鸡', theme: '食物', difficulty: 'easy', aliases: ['香脆炸鸡'], note: '金黄酥脆外皮包裹鲜嫩多汁鸡肉的快乐源泉', drawHint: '一种金黄酥脆油炸肉食' },
  { id: 'fd5', name: '披萨', theme: '食物', difficulty: 'easy', aliases: ['比萨'], note: '铺满芝士、香肠和番茄酱拉丝的圆形烘焙大饼', drawHint: '一种能拉出长长芝士丝的圆形烘焙西餐' },
  { id: 'fd6', name: '冰淇淋', theme: '食物', difficulty: 'easy', aliases: ['雪糕'], note: '冰凉甜美插在蛋筒上的夏日降温圣品', drawHint: '一种装在蛋筒上的冰爽甜点' },
  { id: 'fd7', name: '奶茶', theme: '食物', difficulty: 'easy', aliases: ['珍珠奶茶'], note: '杯底有黑珍珠、插着大吸管的年轻群体续命水', drawHint: '一种插着大粗吸管吸黑珍珠的甜饮品' },
  { id: 'fd8', name: '面条', theme: '食物', difficulty: 'easy', aliases: ['牛肉面'], note: '一根根细长滑溜溜的面食，用筷子挑着吃', drawHint: '一种用筷子捞着吃的长长面食' },

  // 4. 日常物品
  { id: 'ob1', name: '牙刷', theme: '日常物品', difficulty: 'easy', aliases: ['电动牙刷'], note: '早起与睡前配合牙膏清洁口腔的工具', drawHint: '一种早晚刷牙清洁口腔的柄状小工具' },
  { id: 'ob2', name: '雨伞', theme: '日常物品', difficulty: 'easy', aliases: ['伞', '晴雨伞'], note: '下雨遮雨水、艳阳天遮紫外线的折叠装备', drawHint: '一种下雨天撑开挡雨的用具' },
  { id: 'ob3', name: '手机', theme: '日常物品', difficulty: 'easy', aliases: ['智能手机'], note: '装满App现代人哪怕上厕所都离不开的便携通讯终端', drawHint: '一种每个人天天捧在手里的电子屏幕设备' },
  { id: 'ob4', name: '剪刀', theme: '日常物品', difficulty: 'easy', aliases: ['纸剪'], note: '双刃相交运用杠杆原理裁剪纸张布料的工具', drawHint: '一种咔嚓剪纸用的双手柄刀具' },
  { id: 'ob5', name: '手表', theme: '日常物品', difficulty: 'easy', aliases: ['腕表'], note: '戴在手腕上看时间的指针或电子计时器', drawHint: '一种戴在手腕上显示时间的配件' },
  { id: 'ob6', name: '眼镜', theme: '日常物品', difficulty: 'easy', aliases: ['近视镜'], note: '架在鼻梁和耳朵上矫正视力或遮阳的镜片', drawHint: '一种架在鼻梁上辅助视力的两块镜片' },
  { id: 'ob7', name: '书包', theme: '日常物品', difficulty: 'easy', aliases: ['双肩包'], note: '背在背上装课本或笔记本电脑的包', drawHint: '一种学生背在双肩上的装书工具' },
  { id: 'ob8', name: '吹风机', theme: '日常物品', difficulty: 'easy', aliases: ['电吹风'], note: '洗头后通电吹出热风快速吹干头发的电器', drawHint: '一种吹出热风给湿发速干的日用小家电' },

  // 5. 植物
  { id: 'pl1', name: '向日葵', theme: '植物', difficulty: 'easy', aliases: ['太阳花', '朝阳花'], note: '盘面硕大、永远朝向阳光的金色草本', drawHint: '一种圆圆大金盘面朝太阳生长的花' },
  { id: 'pl2', name: '仙人掌', theme: '植物', difficulty: 'easy', aliases: ['仙人球'], note: '生长于沙漠旱地，叶退化成刺防蒸发', drawHint: '一种浑身长满尖刺的沙漠绿色植物' },
  { id: 'pl3', name: '竹子', theme: '植物', difficulty: 'easy', aliases: ['翠竹'], note: '中通外直、节节高升的禾本科木质化植物', drawHint: '一种一节一节高高长长、熊猫爱吃的植物' },
  { id: 'pl4', name: '蒲公英', theme: '植物', difficulty: 'easy', aliases: ['婆婆丁'], note: '成熟后果实自带白色羽毛降落伞随风飞舞', drawHint: '一种一吹就化作白伞伞满天飞的小野花' },

  // 6. 人物和名人
  { id: 'p1', name: '爱因斯坦', theme: '人物和名人', difficulty: 'easy', aliases: ['阿尔伯特·爱因斯坦'], note: '提出相对论的现代物理学泰斗', drawHint: '一位白发乱蓬蓬吐舌头的物理学泰斗' },
  { id: 'p2', name: '李白', theme: '人物和名人', difficulty: 'easy', aliases: ['诗仙'], note: '唐代著名浪漫主义诗人，好饮酒作诗', drawHint: '一位唐代举杯邀明月的诗仙' },
  { id: 'p3', name: '牛顿', theme: '人物和名人', difficulty: 'easy', aliases: ['艾萨克·牛顿'], note: '被苹果砸中灵感发现万有引力定律', drawHint: '一位坐在树下被掉落苹果砸中脑袋的科学家' },

  // 7. 职业
  { id: 'o1', name: '程序员', theme: '职业', difficulty: 'easy', aliases: ['软件工程师', '码农'], note: '键盘敲代码、擅长修Bug与脱发的数字工匠', drawHint: '一位狂敲键盘修Bug、戴眼镜的互联网从业者' },
  { id: 'o2', name: '医生', theme: '职业', difficulty: 'easy', aliases: ['大夫', '医师'], note: '穿白大褂用听诊器看病救人的专业人员', drawHint: '一位穿白大褂脖子挂听诊器的救人白衣天使' },
  { id: 'o3', name: '宇航员', theme: '职业', difficulty: 'medium', aliases: ['航天员'], note: '穿宇航服乘坐火箭探索浩瀚太空的先锋', drawHint: '一位戴大圆头盔在太空中漂浮漫步的人' },
  { id: 'o4', name: '厨师', theme: '职业', difficulty: 'easy', aliases: ['大厨'], note: '戴高白帽、颠勺起锅掌管美味的烹饪师傅', drawHint: '一位戴高高白帽在灶台炒菜的大师傅' },

  // 8. 影视动漫角色
  { id: 'ch1', name: '皮卡丘', theme: '影视、动漫及游戏角色', difficulty: 'easy', aliases: ['黄皮耗子'], note: '宝可梦门面，脸带红晕会十万伏特的电气鼠', drawHint: '一只脸颊红红、尾巴像闪电的黄色电气萌兽' },
  { id: 'ch2', name: '孙悟空', theme: '影视、动漫及游戏角色', difficulty: 'easy', aliases: ['齐天大圣', '美猴王'], note: '从仙石蹦出、手持金箍棒身通七十二变的齐天大圣', drawHint: '一位头戴紧箍儿手握如意金箍棒的神通美猴王' },
  { id: 'ch3', name: '哆啦A梦', theme: '影视、动漫及游戏角色', difficulty: 'easy', aliases: ['机器猫', '小叮当'], note: '来自二十二世纪、肚子有四次元口袋的蓝色机器猫', drawHint: '一只圆头圆脑、肚子有万能口袋的蓝色猫咪' },
  { id: 'ch4', name: '雪人', theme: '影视、动漫及游戏角色', difficulty: 'easy', aliases: ['小雪人'], note: '用白雪堆成，胡萝卜做鼻子，戴围巾帽子', drawHint: '一个胡萝卜当鼻子、由两个白雪球堆成的人偶' },
];

/**
 * 随机乱序并抽取候选词条（用于猜词出题与你画我猜选题）
 */
export function getRandomWords(count: number = 4, theme?: string): WordItem[] {
  let pool = [...WORD_BANK];
  if (theme && theme !== '全部' && theme !== '自定义主题') {
    pool = pool.filter((w) => w.theme === theme);
  }

  // Fisher-Yates 随机打乱
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}

/**
 * 根据词条名查找对应词库对象
 */
export function findWordByName(name: string): WordItem | undefined {
  return WORD_BANK.find((w) => w.name === name || w.aliases?.includes(name));
}
