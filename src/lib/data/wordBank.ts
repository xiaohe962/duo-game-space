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
  '全部',
  '水果',
  '动物',
  '食物',
  '日常物品',
  '交通与建筑',
  '植物与自然',
  '运动与娱乐',
  '人物与职业',
  '影视与动漫',
] as const;

export type ThemeType = (typeof THEMES)[number];

export const WORD_BANK: WordItem[] = [
  // ================= 1. 水果类 =================
  { id: 'fr1', name: '香蕉', theme: '水果', difficulty: 'easy', aliases: ['蕉'], note: '黄色弯弯的外表，剥皮即食软糯香甜', drawHint: '一种弯弯的黄色常见水果' },
  { id: 'fr2', name: '苹果', theme: '水果', difficulty: 'easy', aliases: ['红富士'], note: '红润脆甜，每天一个号称远离医生', drawHint: '一种圆圆的红色常用水果' },
  { id: 'fr3', name: '西瓜', theme: '水果', difficulty: 'easy', aliases: ['夏日西瓜'], note: '绿皮红瓤黑籽，夏天抱着用勺挖着吃的消暑神器', drawHint: '一种夏天必吃的绿皮红瓤大水果' },
  { id: 'fr4', name: '草莓', theme: '水果', difficulty: 'easy', aliases: ['红莓'], note: '心形红艳、表面布满细小芝麻籽的浆果', drawHint: '一种红艳长着小芝麻点的心形水果' },
  { id: 'fr5', name: '橙子', theme: '水果', difficulty: 'easy', aliases: ['甜橙'], note: '金黄多汁富含维C，需剥皮或切块食用', drawHint: '一种多汁的金黄色柑橘类水果' },
  { id: 'fr6', name: '榴莲', theme: '水果', difficulty: 'medium', aliases: ['水果之王'], note: '全身硬刺重铠，气味极其浓烈但口感如奶酪', drawHint: '一种长满硬刺、气味浓烈的热带水果之王' },
  { id: 'fr7', name: '菠萝', theme: '水果', difficulty: 'easy', aliases: ['凤梨'], note: '外皮布满菱形鳞目，头顶绿冠酸甜解腻', drawHint: '一种头顶绿叶冠刺的黄色热带水果' },
  { id: 'fr8', name: '葡萄', theme: '水果', difficulty: 'easy', aliases: ['提子'], note: '一串串晶莹剔透，可酿葡萄酒', drawHint: '一种成串生长的紫红或翠绿小浆果' },
  { id: 'fr9', name: '樱桃', theme: '水果', difficulty: 'easy', aliases: ['车厘子'], note: '两两成对挂着细长绿梗的红润小果', drawHint: '一种两个小红球连着细柄的水果' },
  { id: 'fr10', name: '柠檬', theme: '水果', difficulty: 'easy', aliases: ['青柠'], note: '两头尖尖黄灿灿、咬一口酸掉牙的果实', drawHint: '一种两端尖尖、酸味十足的黄色水果' },
  { id: 'fr11', name: '桃子', theme: '水果', difficulty: 'easy', aliases: ['水蜜桃'], note: '粉白带尖尖的小绒毛果实，寿桃造型', drawHint: '一种粉红色带尖尖的毛茸茸甜果' },
  { id: 'fr12', name: '猕猴桃', theme: '水果', difficulty: 'medium', aliases: ['奇异果'], note: '棕色毛绒外皮，切开翠绿带一圈黑籽', drawHint: '一种棕色毛茸茸、切开是翠绿多籽的水果' },

  // ================= 2. 动物类 =================
  { id: 'an1', name: '大熊猫', theme: '动物', difficulty: 'easy', aliases: ['国宝'], note: '中国国宝，黑白圆润喜欢懒洋洋啃竹子', drawHint: '一种黑白相间爱吃竹子的国宝动物' },
  { id: 'an2', name: '企鹅', theme: '动物', difficulty: 'easy', aliases: ['南极企鹅'], note: '身穿黑白燕尾服、在冰雪上摇摆行走的潜泳鸟', drawHint: '一种在南极冰雪上摇晃行走的黑白鸟类' },
  { id: 'an3', name: '老虎', theme: '动物', difficulty: 'easy', aliases: ['百兽之王'], note: '额带王字条纹、威震山林的独居猫科猛兽', drawHint: '一种额头有王字纹的百兽之王' },
  { id: 'an4', name: '长颈鹿', theme: '动物', difficulty: 'easy', aliases: ['高个子'], note: '地球上最高的陆生哺乳动物，脖子极长', drawHint: '一种脖子极长的高大非洲动物' },
  { id: 'an5', name: '兔子', theme: '动物', difficulty: 'easy', aliases: ['小白兔'], note: '长耳朵红眼睛爱吃胡萝卜和青草', drawHint: '一种长耳朵三瓣嘴蹦跳的可爱小动物' },
  { id: 'an6', name: '猫咪', theme: '动物', difficulty: 'easy', aliases: ['小猫'], note: '会喵喵叫、踩奶抓老鼠的傲娇宠物', drawHint: '一种有胡须爱叫喵喵的常见家宠' },
  { id: 'an7', name: '大象', theme: '动物', difficulty: 'easy', aliases: ['长鼻象'], note: '扇风大耳朵与灵活长鼻子，陆地庞然大物', drawHint: '一种长着长长鼻子和大耳朵的巨型动物' },
  { id: 'an8', name: '小狗', theme: '动物', difficulty: 'easy', aliases: ['小狗勾', '汪汪'], note: '忠诚看家摇尾巴的人类最好朋友', drawHint: '一种摇着尾巴吐舌头汪汪叫的宠物' },
  { id: 'an9', name: '小青蛙', theme: '动物', difficulty: 'easy', aliases: ['青蛙'], note: '大眼睛绿身皮，田野捉害虫呱呱叫', drawHint: '一种绿油油大肚皮爱跳着呱呱叫的动物' },
  { id: 'an10', name: '蝴蝶', theme: '动物', difficulty: 'easy', aliases: ['彩蝶'], note: '五彩斑斓大翅膀，在花丛中翩翩起舞', drawHint: '一种长着漂亮对称翅膀在花丛飞舞的昆虫' },
  { id: 'an11', name: '小蜜蜂', theme: '动物', difficulty: 'easy', aliases: ['蜜蜂'], note: '黄黑条纹小身躯，采蜜嗡嗡飞有小刺', drawHint: '一种屁股有刺、采花蜜嗡嗡飞的小昆虫' },
  { id: 'an12', name: '螃蟹', theme: '动物', difficulty: 'easy', aliases: ['大闸蟹'], note: '八条腿横着走，胸前挥舞两只大钳子', drawHint: '一种横着爬行、长着一对大钳子的甲壳生物' },
  { id: 'an13', name: '章鱼', theme: '动物', difficulty: 'medium', aliases: ['八爪鱼'], note: '圆滚滚大脑袋下摆动着八条带吸盘的长腕足', drawHint: '一种有八条带吸盘触手、会喷墨汁的海洋生物' },
  { id: 'an14', name: '大鲨鱼', theme: '动物', difficulty: 'easy', aliases: ['鲨鱼'], note: '游水露出背上三角鳍的凶猛海洋霸主', drawHint: '一种水面露三角背鳍、满嘴利齿的海洋猛兽' },
  { id: 'an15', name: '小蜗牛', theme: '动物', difficulty: 'easy', aliases: ['蜗牛'], note: '背着重重螺旋小房子慢慢往前爬的软体动物', drawHint: '一种背着螺壳慢吞吞爬行带触角的小生灵' },

  // ================= 3. 食物类 =================
  { id: 'fd1', name: '火锅', theme: '食物', difficulty: 'easy', aliases: ['涮羊肉'], note: '红汤清汤沸腾翻滚，大家围坐涮肥牛毛肚', drawHint: '一种围坐在一起沸水涮肉的热腾腾美食' },
  { id: 'fd2', name: '汉堡包', theme: '食物', difficulty: 'easy', aliases: ['汉堡'], note: '两片圆面包中间夹着厚实肉饼和生菜酱料', drawHint: '一种两片圆面包夹肉饼生菜的西式快餐' },
  { id: 'fd3', name: '披萨', theme: '食物', difficulty: 'easy', aliases: ['比萨'], note: '铺满芝士、香肠和番茄酱拉丝的圆形大饼', drawHint: '一种能拉出长长芝士丝的切角圆形烘焙食物' },
  { id: 'fd4', name: '冰淇淋', theme: '食物', difficulty: 'easy', aliases: ['雪糕'], note: '冰凉甜美插在脆皮蛋筒上的降温甜点', drawHint: '一种装在蛋筒上像螺旋帽子一样的甜点' },
  { id: 'fd5', name: '珍珠奶茶', theme: '食物', difficulty: 'easy', aliases: ['奶茶'], note: '杯底有黑珍珠、插着大吸管的快乐水', drawHint: '一种杯底有黑圆圆珍珠和粗吸管的饮料' },
  { id: 'fd6', name: '甜甜圈', theme: '食物', difficulty: 'easy', aliases: ['多拿滋'], note: '中间有个圆形空洞、表面淋满彩糖巧克力的炸面包', drawHint: '一种中间有个圆洞、洒满糖霜的油炸圈' },
  { id: 'fd7', name: '荷包蛋', theme: '食物', difficulty: 'easy', aliases: ['煎蛋'], note: '蛋白包裹金黄流心圆蛋黄的早餐常客', drawHint: '一种白底中间一个金黄圆蛋黄的煎蛋' },
  { id: 'fd8', name: '烤鸡腿', theme: '食物', difficulty: 'easy', aliases: ['大鸡腿'], note: '金黄油亮一根白骨手抓着啃的肉食', drawHint: '一种一端有根骨头抓着吃的油亮烤肉' },
  { id: 'fd9', name: '爆米花', theme: '食物', difficulty: 'easy', aliases: ['玉米花'], note: '电影院看大片必配的甜脆蓬松小零食', drawHint: '一种装在纸桶里像小云朵一样的电影院零食' },
  { id: 'fd10', name: '棒棒糖', theme: '食物', difficulty: 'easy', aliases: ['波板糖'], note: '插在白色细塑料棍上的彩色硬糖球', drawHint: '一种插在一根细棍上的七彩圆形糖果' },

  // ================= 4. 日常物品 =================
  { id: 'ob1', name: '雨伞', theme: '日常物品', difficulty: 'easy', aliases: ['伞'], note: '下雨遮雨水、艳阳天遮紫外线的折叠装备', drawHint: '一种下雨天撑开挡雨的拱形用具' },
  { id: 'ob2', name: '眼镜', theme: '日常物品', difficulty: 'easy', aliases: ['墨镜'], note: '架在鼻梁和耳朵上矫正视力或遮阳的镜片', drawHint: '一种架在鼻梁上有两个镜框和镜腿的物品' },
  { id: 'ob3', name: '剪刀', theme: '日常物品', difficulty: 'easy', aliases: ['小剪刀'], note: '双刃相交运用杠杆原理裁剪纸张的工具', drawHint: '一种有两个圆孔手柄交叉剪纸的工具' },
  { id: 'ob4', name: '台灯', theme: '日常物品', difficulty: 'easy', aliases: ['书桌灯'], note: '摆在书桌上弯着脖子发光的小照明灯', drawHint: '一种放桌上有个罩子发光的弯脖子灯' },
  { id: 'ob5', name: '闹钟', theme: '日常物品', difficulty: 'easy', aliases: ['小闹钟'], note: '头顶两个小金属耳朵打铃叫早晨起床的表', drawHint: '一种头顶两只小铜钟、有指针的定时发声钟' },
  { id: 'ob6', name: '牙刷', theme: '日常物品', difficulty: 'easy', aliases: ['刷牙刷'], note: '早起与睡前配合牙膏清洁牙齿的小毛刷', drawHint: '一种手柄长长、头部有一排细毛的洁牙工具' },
  { id: 'ob7', name: '水杯', theme: '日常物品', difficulty: 'easy', aliases: ['马克杯'], note: '带把手盛水喝水的圆筒形容器', drawHint: '一种旁边带弯把手装水喝的圆杯子' },
  { id: 'ob8', name: '钥匙', theme: '日常物品', difficulty: 'easy', aliases: ['门钥匙'], note: '插进锁芯咔哒开门的齿状金属小工具', drawHint: '一种一头是圆环、一头带小齿开锁的金属物件' },
  { id: 'ob9', name: '帽子', theme: '日常物品', difficulty: 'easy', aliases: ['棒球帽', '鸭舌帽'], note: '戴在头顶遮阳挡风有帽檐的服饰', drawHint: '一种戴在头上有突出前檐的服饰配件' },
  { id: 'ob10', name: '球鞋', theme: '日常物品', difficulty: 'easy', aliases: ['运动鞋'], note: '穿在脚上系着鞋带跑步打球的运动装备', drawHint: '一种系着鞋带有橡胶底的跑步鞋子' },

  // ================= 5. 交通与建筑 =================
  { id: 'tr1', name: '飞机', theme: '交通与建筑', difficulty: 'easy', aliases: ['客机'], note: '长着两只大机翼在蓝天白云间穿梭的客机', drawHint: '一种在天空中翱翔、长着机翼和尾翼的飞行器' },
  { id: 'tr2', name: '小汽车', theme: '交通与建筑', difficulty: 'easy', aliases: ['轿车'], note: '四个轮子在柏油马路上跑的家用汽车', drawHint: '一种有四个轮子、车顶有车窗的陆地交通工具' },
  { id: 'tr3', name: '自行车', theme: '交通与建筑', difficulty: 'easy', aliases: ['单车'], note: '双手把方向、两脚踩脚踏板骑行的人力车', drawHint: '一种两个大轮子、用脚蹬脚踏板骑的车' },
  { id: 'tr4', name: '热气球', theme: '交通与建筑', difficulty: 'easy', aliases: ['大汽球'], note: '巨大水滴气囊喷火加热载着吊篮升空的飞行器', drawHint: '一种大大的彩色气囊下面挂着载人吊篮的装置' },
  { id: 'tr5', name: '小帆船', theme: '交通与建筑', difficulty: 'easy', aliases: ['帆船'], note: '三角形白帆迎风飘扬在水面航行的船只', drawHint: '一种中间竖着三角形白帆在海浪上的小船' },
  { id: 'tr6', name: '火箭', theme: '交通与建筑', difficulty: 'easy', aliases: ['航天火箭'], note: '尾部喷射巨大烈焰直冲外太空的尖锥飞行器', drawHint: '一种头尖尖、屁股喷火冲向太空的发射装置' },
  { id: 'tr7', name: '灯塔', theme: '交通与建筑', difficulty: 'medium', aliases: ['海边灯塔'], note: '耸立在海岸礁石上为夜航船只指引方向的高塔', drawHint: '一座海边高高耸立、顶部向黑夜射出光柱的光塔' },
  { id: 'tr8', name: '风车', theme: '交通与建筑', difficulty: 'easy', aliases: ['大风车'], note: '荷兰四叶大叶片随风缓缓转动的田园建筑', drawHint: '一种有四片巨大十字叶片随风旋转的建筑' },
  { id: 'tr9', name: '城堡', theme: '交通与建筑', difficulty: 'medium', aliases: ['欧洲古堡'], note: '童话里国王公主居住的带锥形尖顶石头堡垒', drawHint: '一座有很多圆形尖尖尖顶城楼的欧式石堡' },

  // ================= 6. 植物与自然天体 =================
  { id: 'nt1', name: '太阳', theme: '植物与自然', difficulty: 'easy', aliases: ['红日'], note: '天空中心散发温暖光芒的大火球', drawHint: '一个周围散发着一圈光芒光芒的圆圆金球' },
  { id: 'nt2', name: '月亮', theme: '植物与自然', difficulty: 'easy', aliases: ['弯月', '月牙'], note: '夜空中弯弯像小船一样的明亮天体', drawHint: '夜空中像小香蕉船一样弯弯的黄色月牙' },
  { id: 'nt3', name: '彩虹', theme: '植物与自然', difficulty: 'easy', aliases: ['七彩虹'], note: '雨过天晴挂在天边的七彩半圆形光桥', drawHint: '下雨后天空中出现的一道弯弯七彩拱桥' },
  { id: 'nt4', name: '向日葵', theme: '植物与自然', difficulty: 'easy', aliases: ['太阳花'], note: '盘面硕大、永远朝向阳光的金色大花', drawHint: '一种花盘圆圆像太阳、长满瓜子的金黄色花' },
  { id: 'nt5', name: '仙人掌', theme: '植物与自然', difficulty: 'easy', aliases: ['仙人球'], note: '生长于沙漠旱地，浑身长满防蒸发尖刺', drawHint: '一种绿油油长满小尖刺的沙漠肉质植物' },
  { id: 'nt6', name: '小雪人', theme: '植物与自然', difficulty: 'easy', aliases: ['雪人'], note: '冬天用两个白雪球堆成，胡萝卜做鼻子', drawHint: '一个两个大雪球叠在一起、插胡萝卜鼻子的人形' },
  { id: 'nt7', name: '蘑菇', theme: '植物与自然', difficulty: 'easy', aliases: ['小蘑菇'], note: '下雨后森林树下冒出的小伞状菌类', drawHint: '一种像一把小雨伞一样长在地上的小菌子' },
  { id: 'nt8', name: '小火苗', theme: '植物与自然', difficulty: 'easy', aliases: ['火焰'], note: '火柴点燃跳动的红色黄色舌状热能', drawHint: '一朵向上跳跃扭动的红黄色舌状火苗' },

  // ================= 7. 运动与娱乐 =================
  { id: 'sp1', name: '足球', theme: '运动与娱乐', difficulty: 'easy', aliases: ['皮球'], note: '黑白六边形拼块组合成的草坪踢球运动', drawHint: '一个黑白五边形黑白相间的圆形皮球' },
  { id: 'sp2', name: '篮球', theme: '运动与娱乐', difficulty: 'easy', aliases: ['大篮球'], note: '橙色表面带黑色弧线投向篮筐的大皮球', drawHint: '一个橙色带几条黑色弧形条纹的投篮皮球' },
  { id: 'sp3', name: '羽毛球', theme: '运动与娱乐', difficulty: 'easy', aliases: ['球'], note: '白鹅毛插在半圆软木托上挥拍击打的飞球', drawHint: '一种像漏斗小伞一样插满白羽毛的轻盈球' },
  { id: 'sp4', name: '乒乓球拍', theme: '运动与娱乐', difficulty: 'easy', aliases: ['球拍'], note: '红色橡胶小圆木板打国球的小拍子', drawHint: '一个圆圆扁扁带手柄贴红胶皮的打球小拍子' },
  { id: 'sp5', name: '滑板', theme: '运动与娱乐', difficulty: 'easy', aliases: ['滑轮板'], note: '一块长条木板底下四个小轮子踩着滑行', drawHint: '一块两头微微翘起、底部有四个小轮的滑行板' },
  { id: 'sp6', name: '吉他', theme: '运动与娱乐', difficulty: 'medium', aliases: ['木吉他', '六弦琴'], note: '葫芦形木质琴身连着长琴颈的六弦弹拨乐器', drawHint: '一种葫芦形共鸣箱、上面拉着几根琴弦的弹拨乐器' },
  { id: 'sp7', name: '风筝', theme: '运动与娱乐', difficulty: 'easy', aliases: ['纸鸢'], note: '春天拽着长线迎着微风飞向蓝天的菱形纸鸢', drawHint: '一个拴着长线在天上飞、拖着尾巴的菱形骨架' },

  // ================= 8. 人物与动漫 =================
  { id: 'ch1', name: '皮卡丘', theme: '影视与动漫', difficulty: 'easy', aliases: ['电气鼠'], note: '宝可梦门面，脸带红晕会十万伏特的电气鼠', drawHint: '一只脸颊红红、尾巴像闪电的黄色萌兽' },
  { id: 'ch2', name: '哆啦A梦', theme: '影视与动漫', difficulty: 'easy', aliases: ['机器猫'], note: '来自未来、肚子有万能口袋的圆头蓝猫', drawHint: '一只圆头圆脑、肚子带半圆口袋的无耳蓝猫' },
  { id: 'ch3', name: '海绵宝宝', theme: '影视与动漫', difficulty: 'easy', aliases: ['小海绵'], note: '住在比奇堡菠萝屋里爱煎蟹黄堡的黄色方块海绵', drawHint: '一块长着大板牙、穿棕短裤的黄色多孔方块' },
  { id: 'ch4', name: '小黄鸭', theme: '影视与动漫', difficulty: 'easy', aliases: ['大黄鸭'], note: '洗澡浴缸里浮在水面上的黄色塑料充气鸭子', drawHint: '一只圆滚滚黄色身体、长着扁扁橘色嘴巴的戏水鸭' },
];

/**
 * 随机抽取候选词条（支持排除历史已出词条，杜绝短期重复）
 */
export function getRandomWords(
  count: number = 4,
  theme?: string,
  excludeNames: string[] = []
): WordItem[] {
  let pool = [...WORD_BANK];

  if (theme && theme !== '全部' && theme !== '自定义主题') {
    pool = pool.filter((w) => w.theme === theme);
  }

  // 过滤掉近期已出现过的词条
  const excludeSet = new Set(excludeNames.map((s) => s.trim().toLowerCase()));
  let freshPool = pool.filter((w) => !excludeSet.has(w.name.toLowerCase()));

  // 若剩余词池不足 count 个，说明整轮已接近抽空，自动复位从全池抽取
  if (freshPool.length < count) {
    freshPool = pool;
  }

  // Fisher-Yates 均匀乱序
  for (let i = freshPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [freshPool[i], freshPool[j]] = [freshPool[j], freshPool[i]];
  }

  return freshPool.slice(0, count);
}

/**
 * 根据词条名查找对应词库对象
 */
export function findWordByName(name: string): WordItem | undefined {
  return WORD_BANK.find((w) => w.name === name || w.aliases?.includes(name));
}
