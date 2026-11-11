# 雨中曲 V4 · 黑白雨夜街道原型 A

基于现有作品增量开发，先验证统一世界空间、人物移动、雨水碰撞与材质声音。

**[下载可玩原型 ZIP](https://github.com/jiangxinxiao8-art/codex-trail/raw/refs/heads/prototype/rain-v4-street-20261111/rain-in-rain-v4-prototype-a.zip)**

解压到新文件夹，进入 rain-in-rain-app，双击 **启动雨中曲.cmd**。仍需 Node.js 22 或更新版本，服务会打开 localhost。五首原始音乐、模型、WASM 和字体均保留。

- 真实三维建筑、关节角色、镜头跟随与观察角度切换。
- 动态雨滴扫掠碰撞金属、玻璃、屋顶、石板和积水。
- 张掌/鼠标拖动引雨，不同材质发出不同的声音。
- 灯下排列旋律、院门打开、进入小院并回访原水洼。
- 单路摄像头镜像小窗，关闭小窗继续识别；鼠标、键盘均可操作。

当前只完成原型 A。三维飞行 B、三维室内 C 和七章新故事尚未开发。旧版完整作品通过 `?version=3` 打开，原代码和旧 ZIP 均保留。

[中文操作说明](rain-in-rain-app/README.md) · [实际验证和限制](rain-in-rain-app/docs/v4/VALIDATION.md) · [实际依赖版本](rain-in-rain-app/docs/v4/dependencies.txt) · [使用的技能](rain-in-rain-app/docs/v4/SKILLS.md)

[街道实际渲染截图](rain-in-rain-app/docs/v4/screenshots/street.png) · [绕转观察截图](rain-in-rain-app/docs/v4/screenshots/orbit.png)

项目级技能及来源锁位于 `.agents/skills/` 和 `skills-lock.json`。摄像头真人稳定性、Windows 启动和实际 GPU 性能仍需本机验证，云端软件 WebGL 测试不等于真人设备验收。
