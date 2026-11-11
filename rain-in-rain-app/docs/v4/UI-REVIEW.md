# 界面审查

审查对象：src/prototype/main.ts、style.css、src/main.ts 和 index.html。依据为本轮新获取的 Vercel Web Interface Guidelines，原文保存在 web-guidelines-source.md。

已处理：
- 按钮/表单语义、表单 label 和 name、图标按钮 aria-label、状态 aria-live。
- 标题层级、跳过链接、键盘可操作；方向键/空格/Enter 覆盖核心鼠标交互。
- 原生 dialog 焦点约束，Esc 关闭、恢复按钮焦点；暂停层将背景控件设为 inert。
- 可见 focus-visible；暂停/继续可操作；没有 transition: all。
- 系统减少动态偏好、可选减少镜头运动；没有震屏或全屏闪烁。
- 安全区域和响应式容器；宽屏/竖屏实际截图；重要文字不依赖颜色表示状态。
- 空间提示避免与角色身体重叠，保留指向真实对象落点的小点和细引线。
- 深色 color-scheme/theme-color、本地字体预加载与 font-display:swap。
- 画面始终与实际相机比例一致，摄像头预览独立镜像、可收起。

本轮没有引入仪表盘、分数计时器或大块菜单来替代场景引导。
