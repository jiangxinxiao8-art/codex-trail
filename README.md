# 雨中曲 · Sing in the Rain — V3 功能预览

在原版上增量升级：电影式开场、手写署名、单路摄像头预览、平滑掌心移动、分层城市、舞蹈与透视飞翔、三道光环、完整降落和归家五项互动。

**当前为可运行的 V3 程序绘制版；用户发送的原图只有聊天预览，原始图片文件仍待 ZIP 附件，尚未完成最终原图美术整合。**

## 下载与开始

[下载 V3 功能预览 ZIP](https://github.com/jiangxinxiao8-art/codex-trail/raw/refs/heads/upgrade/rain-v3-20261111/rain-in-rain-v3.zip)

解压到新文件夹，保留旧版。安装 Node.js LTS 后双击项目中的 **`启动雨中曲.cmd`**。首次安装依赖后，自动在本机浏览器打开 localhost。真实模型、WASM、五首歌曲与手写字体均附带。

Windows 启动脚本需在用户本机验证；云端已验证 Node/Vite 和 Chrome 工作流。也可在项目文件夹手动运行：

```powershell
npm.cmd install
npm.cmd start
```

- [完整中文说明](rain-in-rain-app/README.md)
- [实际测试与尚未完成项](rain-in-rain-app/VALIDATION.md)
- [资源与 SHA256 清单](rain-in-rain-app/ASSETS.json)
- [V3 原始开发要求](rain-in-rain-app/docs/V3-REQUIREMENTS.md)

## 原图与本机验收

请把原始场景、人物设定和动作图作为 ZIP 文件附件上传，即可在保留原文件的前提下继续接入。无需访问 D 盘，也不要求用户手工改配置。游戏设置另有「载入我的插画」，可本地选择文件并仅保存在浏览器。

仍需真实电脑验证摄像头权限、单手稳定性/方向、飞行舒适度、Windows 启动脚本、实际 GPU 性能及耳机音量。云端软件 WebGL 室内帧率较低，不把模拟设备测试称为真人验收。
