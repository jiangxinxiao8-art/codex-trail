# 雨中曲 · Sing in the Rain

六幕互动艺术网页项目，包含完整源代码、五首原始 MP3 和本地 MediaPipe WASM。

## 下载项目

**[点击下载《雨中曲》项目压缩包（约 34 MB）](https://github.com/jiangxinxiao8-art/codex-trail/raw/refs/heads/main/rain-in-rain-app.zip)**

也可以点击本页上方 **Code → Download ZIP** 下载整个仓库，再进入 `rain-in-rain-app` 文件夹。

## 本地运行

安装 Node.js 22 或更新版本，在项目文件夹打开终端：

```sh
cd rain-in-rain-app
npm install
npm run dev
```

最新版已附带经过官方 MD5 和固定 SHA256 校验的手部模型，无需另行下载。摄像头画面仅在本地浏览器处理。`npm run assets` 可选用于校验或修复资源。

旧版模型缺失报错时，可[单独下载手部模型](https://github.com/jiangxinxiao8-art/codex-trail/raw/refs/heads/main/rain-in-rain-app/public/assets/models/hand_landmarker.task)，放入项目的 `public/assets/models/` 后刷新页面。

模型未就绪或摄像头不可用时可使用鼠标：移动控制人物，点击模拟捏合，按住空格模拟张掌。五首音乐已包含，无需重新生成。

## 项目说明与验证

- [完整中文说明及故障排查](rain-in-rain-app/README.md)
- [实际验证记录](rain-in-rain-app/VALIDATION.md)
- [资源清单与校验值](rain-in-rain-app/ASSETS.json)

已通过构建、6 项单元测试、完整六幕鼠标浏览器流程及五首音乐播放顺序检查。真实摄像头单手识别与实际耳机听感仍需本地验收。三张聊天插画用于风格参考，原始 PNG 文件未包含在项目包内。

官方模型在 Chromium 中已通过初始化与模拟摄像头视频推理测试。真实电脑摄像头和真人手势识别仍需用户验收。
