五首上传原始 MP3 在 audio/，均保持 SHA256。官方手部模型在 models/，来源与校验见 provenance.json；WASM 来自匹配 npm 包；中文手写字体和 OFL 授权在 fonts/。

场景.zip 中的 11 张 PNG 已逐字节保留在 images/originals/，原文件名不变。images/original-inventory.json 保存原图大小和 SHA256，images/manifest.json 已登记实际路径。

images/derived/ 是明确独立的 AI 编辑衍生素材：city-clean.png 去掉固定落地路灯与多数雨线，home-clean.png 去掉固定交互物件并打开门洞，foreground-left.png 提取透明前景。原始图片未被覆盖；动态对象由程序绘制。

此次场景 ZIP 没有人物和动作原文件，继续使用已有的独立关节角色。更多来源与校验见项目 ASSETS.json。
