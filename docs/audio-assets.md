# 已接入的音乐与音效

音频存放在 `public/assets/audio/`，由 Web Audio 解码播放。此次替换不依赖外部热链、在线生成服务或第三方音频库。

## 配乐

| 随机曲库 | 文件 | 来源 | 大约时长 |
|---|---|---|---|
| JRPG Theme | menu.mp3 | [Juhani Junkala / SubspaceAudio](https://opengameart.org/content/jrpg-trailer-theme) | 1:39 |
| Army Approaching | battle.mp3 | [JRPG Pack 5 Action](https://opengameart.org/content/jrpg-pack-5-action) | 2:04 |
| Epic Boss Battle | boss.mp3 | [Boss Battle Music](https://opengameart.org/content/boss-battle-music) | 2:03 |
| Encounter With The Witches | forest.mp3 | [JRPG Pack 5 Action](https://opengameart.org/content/jrpg-pack-5-action) | 1:53 |
| Preparing For Battle | preparation.mp3 | [JRPG Pack 5 Action](https://opengameart.org/content/jrpg-pack-5-action) | 0:54 |

五首均选择作者发布的 CC0 版本。以固定增益将试听响度调到约 -20 LUFS，保留原始结构，编码为 128 kbps MP3；终点使用原文件的样本数除以 44100，避免把有损编码的额外尾部放进播放周期。原始样本数依次是 4387319、5478777、5443201、5007484、2419201。游戏自动随机播放，不提供手动选曲；地图、普通战斗和首领阶段之间保留当前曲目。

## 音效

| 文件／用途 | 原始素材与作者 |
|---|---|
| attack-1 / attack-2：近战交替 | artisticdude 的 swish_2、swish_3；rubberduck 的 wood_02、metal_01 |
| arrow：弓箭 | artisticdude 的 Bow |
| magic / fire-cast：怪物远程、火球施放 | rubberduck 的 spell_01、spell_fire_07 |
| explosion：火球与首领技能落点 | qubodup / Iwan Gabovitch 的 synthetic_explosion_1 |
| collapse：建筑倒塌 | rubberduck 的 wood_04、stones_03、stones_02 组合 |
| heal / heal-spell：修士与主动治疗 | Julie Damsgaard / Spring Spring 的 health_restore，分别剪辑为短、长版本 |
| warning / select：首领预警、选卡 | rubberduck 的 creature_roar_02、item_gem_02 |
| win / loss：胜负短乐句 | Kenney 的 jingles_PIZZA02、jingles_PIZZA01 |

来源：[Battle Sound Effects](https://opengameart.org/content/battle-sound-effects)、[80 CC0 RPG SFX](https://opengameart.org/content/80-cc0-rpg-sfx)、[Synthesized explosion](https://opengameart.org/content/synthesized-explosion)、[Magic Words + Healing Sound Effect](https://opengameart.org/content/magic-words-healing-sound-effect)、[85 Short music jingles](https://opengameart.org/content/85-short-music-jingles)。全部选择 CC0 1.0；处理包括短切、淡入淡出、峰值留量、素材叠加及 96 kbps MP3 编码。发布文件共 5 首配乐、13 个音效文件，合计约 8.4 MB。

完整来源、作者、处理记录、文件大小及 SHA256 位于 `public/assets/audio/catalog.json` 与 `CREDITS.txt`。

## 播放与混音

- 页面加载不创建音频上下文；首次指针或键盘操作解锁。音频下载与解码不阻塞进入地图或战斗。
- 背景音乐默认 18%、音效 35%，独立开关与滑杆。旧存档继续使用原音效音量，已有静音选择同时应用为新增音乐开关的初值。
- 每轮将五首曲目打乱、每首播放一次，下一轮首曲避免与上一轮末曲相同。预载下一首，在当前曲末约 0.6 秒自动交叉淡入淡出；若下一首加载失败则继续当前循环并重试。暂停会取消轮播定时器并记住位置，恢复后继续该曲目；场景、画面尺寸变化不重排队列。音乐最多保留两首已解码缓存。
- 每类音效有最小触发间隔与并发限制，总并发上限为 8。近战交替两个素材；重要爆炸、预警与倒塌可挤掉普通提示，并临时压低音乐。输出经过压缩限幅，避免高音量混音削波。
- 火球施放和落点分开触发；范围伤害的受击者不重复叠加近战音。主动治疗只在落点播放一次，普通修士治疗使用更轻的短版本。胜负结算淡出配乐并播放独立短乐句。
- 切后台自动暂停所有声音，战斗返回后保留“点击继续”要求。地图返回可恢复音乐。浏览器音频上下文被系统中断时停止节点，下次操作尝试恢复。
- 音频失败不影响战斗；失败请求有重试间隔，设置中出现重新加载入口。素材都从同源部署路径加载，支持 GitHub Pages 项目子目录。

## 验收

回归覆盖声音事件分组、异步加载取消、音乐切换竞态、暂停偏移、独立静音、并发优先级、缓存限制、浏览器上下文中断与旧存档迁移。实际浏览器验收页复用正式模块，观察真实 AudioBufferSourceNode 和输出分析器；本地验收数据位于被 Git 忽略的 `artifacts/audio-integration/`。

仍需实体 iPhone Safari 复验系统静音、耳机／扬声器切换、锁屏或来电后的恢复。桌面浏览器与手机尺寸模拟不代表实体 iOS 验收。
