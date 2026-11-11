# 雨中曲 · Sing in the Rain — V3 场景原图版

电影式开场、单路摄像头预览、平滑掌心移动、舞蹈与透视飞翔、三道光环、完整降落和归家五项互动。已接入用户提供的 11 张场景原图，保留原文件名及五首原始歌曲。

## 下载与开始

[下载 V3 场景原图版 ZIP](https://github.com/jiangxinxiao8-art/codex-trail/raw/refs/heads/upgrade/rain-v3-art-20261111/rain-in-rain-v3-art.zip)

解压到新文件夹，保留旧版。安装 Node.js LTS 后双击项目中的 **`启动雨中曲.cmd`**。首次安装依赖后，自动在本机浏览器打开 localhost。场景图、真实模型、WASM、五首歌曲与手写字体均附带，无需手动配置图片。

Windows 启动脚本需在本机验证；云端已验证 Node/Vite 和 Chrome 工作流。也可在项目文件夹手动运行：

```powershell
npm.cmd install
npm.cmd start
```

- [完整中文说明](rain-in-rain-app/README.md)
- [实际测试与限制](rain-in-rain-app/VALIDATION.md)
- [资源与 SHA256 清单](rain-in-rain-app/ASSETS.json)
- [V3 原始开发要求](rain-in-rain-app/docs/V3-REQUIREMENTS.md)

11 张原图完整保存于 `public/assets/images/originals/`。独立衍生图用于去除固定物件、动态灯光和透明前景。ZIP 中没有人物动作原文件，继续使用已有的独立关节角色。

仍需真实电脑验证摄像头权限、单手稳定性、飞行舒适度、Windows 启动脚本、实际 GPU 性能及耳机音量。
