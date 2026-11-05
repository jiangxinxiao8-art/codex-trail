# 雨中曲 · Sing in the Rain

一部 Vite + TypeScript / PixiJS / GSAP / MediaPipe / Tone.js 的本地互动艺术作品。人物、雨滴、雨伞、涟漪、粒子和城市均为独立实时绘制对象。三张聊天参考图用于构图和色彩参考，没有将包含人物的整幅插画叠在互动人物后面。

## 本地运行（Windows / macOS / Linux）

需要 Node.js 22 或更新版本、Chrome / Edge 桌面浏览器。Windows 可将本项目文件夹复制到 `D:\雨中曲\rain-in-rain-app`，原始素材不需要移动或修改。

```sh
cd rain-in-rain-app
npm install
npm run assets
npm run dev
```

打开终端显示的 localhost 地址（通常端口 5173）。点击「开始体验」后才会请求摄像头、启动音频。可以直接选择「使用鼠标」。用全屏按钮或 F11 进入 16:9 体验，建议佩戴耳机。

```sh
npm run build
npm run preview
npm test
```

`npm run build` 包含 TypeScript 类型检查。`npm test` 检查捏合边缘、防抖、张掌和完整剧情状态机。

## 必须先准备真实手部模型

当前云环境阻止 `storage.googleapis.com`，因此交付时模型可能仍未下载。**不能把鼠标模式当作摄像头已经验收。** `npm run assets` 会：

1. 从已安装的 `@mediapipe/tasks-vision` 复制 WASM 到 `public/assets/wasm`。
2. 从 MediaPipe 官方固定版本地址下载模型：
   `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`
3. 校验 HTTPS 响应中 Google 提供的 MD5，再检查文件大小与 task ZIP 签名，记录 SHA256 和来源。校验失败不会创建模型占位文件。

需要系统 `curl`（Windows 10/11 通常自带）。下载完成后模型在 `public/assets/models/hand_landmarker.task`。模型和 WASM 均从本地服务加载，运行时不调用云端推理。云环境已保存所需域名的网络草稿，需在环境设置中保存并发布后才生效。

## 操作与六幕剧情

| 幕 | 摄像头操作 | 鼠标操作 | 最低展示时间 / 完成条件 |
|---|---|---|---|
| 城市 | 移动食指 | 左右移动鼠标 | 40 秒 / 累计两段行走 |
| 雨滴 | 指向发光雨滴并捏合 | 点击发光雨滴 | 45 秒 / 5 次触碰 |
| 雨伞 | 地面空处捏合 | 点击街道或水面 | 45 秒 / 5 把伞 |
| 梦境 | 靠近右侧水洼并捏合 | 走近并点击右侧水洼 | 40 秒 / 1 次触碰 |
| 舞蹈 | 张掌左右挥动 | 按住空格左右移动 | 95 秒 / 14 段有效挥动 |
| 结尾 | 张掌静止两秒 | 按住空格并停住两秒 | 25 秒 / 完成停留 |

顺利完成约 4 分 50 秒至 6 分钟；不会在无交互时自动播放下一幕。停留过久提示会呼吸闪烁，并出现「点击示范这一步」辅助按钮。用户可以自主停留超过 7 分钟，作品不会强制抢走操作。每个辅助点击实际演示一个交互并反馈声音。

顶部控制：暂停、静音、设置、全屏。设置中可分别调节总音量、环境声、背景音乐与互动音符，可切换鼠标或重新开始。切出标签页自动暂停，回来点击继续。重新开始会停止摄像头并回到标题。

## 音频资源映射（保留上传文件原名）

| 内部编号 | 项目路径 | 使用场景 |
|---|---|---|
| music_01 | `public/assets/audio/01歌曲：Empty City at Night.mp3` | CITY |
| music_02 | `public/assets/audio/02歌曲_Raindrops on Glass.mp3` | RAINDROP、UMBRELLA |
| music_03 | `public/assets/audio/03歌曲_Imaginary World Beneath the.mp3` | DREAM |
| music_04 | `public/assets/audio/04歌曲_Magical Rainy City.mp3` | DANCE |
| music_05 | `public/assets/audio/05歌曲_D Major Reprise.mp3` | ENDING |

第一首实际文件名含全角冒号，已按上传的真实名称映射。资源清单见 `src/assets.ts`。五首 MP3 已复制到项目；原始上传文件保持不变。静态素材在 Git 中默认忽略，**复制项目或制作发布包时须带上 public/assets**。也可在设置面板同时导入本地五首 MP3；文件只在当前浏览器会话中读取。

音乐预加载到 Tone.Player。第二、三幕共享 music_02，不会重复从头播放；其余切换 2.5 秒交叉淡入淡出，每段独立 Gain。音乐结束后不循环，雨声与互动继续。所有通道经过总增益和 -3dB limiter。雨声为明确标记的临时粉红噪声滤波合成环境音；没有声称使用未提供的雨声录音。互动音色采用复用的 FM 合成铃音、混响和轻延迟，不使用虚构采样。音阶 D/E/F#/A/B，主题动机按要求单独准确播放 D–F–A–F（开头、高潮、结尾）；它与 D 大调五声音阶的 F# 有意区分。

三张图在聊天中可见，但未获得可下载的原始图片文件路径，所以 `public/assets/images` 不包含伪造的同名素材。它们已用于设计参考：黑色细线城市、弯曲路灯、蘑菇雨伞、淡黄色/雾蓝/浅紫、暖色梦境建筑与水面光带。

## 模块

- `src/camera/`：MediaPipe 生命周期、21 点单手识别、归一化捏合迟滞和 260ms 冷却、张掌、鼠标适配。
- `src/app/`：六幕状态机、输入平滑、事件路由、暂停重启和辅助交互。
- `src/visual/`：PixiJS 城市、独立头/身体/四肢角色、雨、伞、倒影、涟漪和粒子；GSAP 弹性与色彩过渡。
- `src/audio/`：独立音乐管理、三条通道、复用互动合成器。
- `scripts/prepare-assets.mjs`：官方模型及 WASM 准备。
- `scripts/browser-test.mjs`：真实 Chromium 全幕鼠标流程和截图；需要运行 `npm run dev`。Linux 默认 `/usr/bin/chromium`，其他平台通过 `CHROME_PATH` 设置可执行文件路径。

## 常见问题

- **摄像头打不开**：只能在 localhost 或 HTTPS 下使用。检查站点权限和系统隐私设置，关闭占用摄像头的视频软件。无设备/拒绝权限会自动提示并回退鼠标。
- **摄像头打开但识别初始化失败**：执行 `npm run assets`，确认 `.task` 与 WASM 返回真实文件而非 Vite HTML 回退页。网络受限时须允许官方模型域名。不能关闭 TLS 或伪造文件。
- **跟踪丢失**：保持单只手、光线充足，手掌完整进入摄像头视野。检测约 15 FPS，画面独立刷新。丢手后停止张掌与触发状态，不会用陈旧数据继续舞蹈。
- **没有声音**：先点击开始，检查系统音量、静音按钮和三条通道。音频解码失败会显示具体曲目提示；可重新导入。
- **操作卡住**：查看幕提示。雨滴必须点击发光目标；雨伞在画面下方；水洼在右侧。稍候会出现辅助示范按钮。鼠标张掌用空格。
- **手机或低性能设备**：本项目优先面向桌面。画面按 16:9 居中，保留留边；分辨率倍率封顶 2。软件 WebGL 性能可能较低。

## 验证范围与限制

已实际安装依赖、启动 Vite、运行生产构建。摄像头原型的鼠标交互、音频初始化、无设备回退已用 Chromium 验证；状态机/手势合成关键点单元测试 4 项通过。五首 MP3 均经过 ffprobe 解码信息检查，原始音轨时长约 160–195 秒。完整六幕鼠标浏览器测试及五首音乐启动顺序已通过，0 未捕获异常；暂停、重新开始、缺失模型时摄像头释放与鼠标回退均通过。测试模拟剧情等待时间，保留真实交互和 Web Audio 时钟。记录见 `VALIDATION.md`。

需要用户在真实电脑上验收：摄像头权限、模型成功加载后的真人单手识别稳定性、光照与遮挡条件、镜像方向、真实音箱/耳机的听感、与上传参考画面的艺术贴合度。合成关键点测试和鼠标测试不能替代这些真人验证。

浏览器验收命令（需先启动开发服务器）：

```sh
npm run test:browser
# 以下只用于验证“模型尚未安装”时的失败回退分支
npm run test:camera-fallback
```
