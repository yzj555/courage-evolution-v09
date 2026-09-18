# 资源说明

本目录从当前修订 09 页面提取六个形态实际使用的 COLLADA 模型、常规贴图、眨眼贴图和参考图。
`index.json` 是构建资源清单。构建脚本读取这些文件并重新内嵌到 HTML，无需从旧页面提取。

模型来源沿用原项目：Digimon Linkz / Cyber Sleuth；社区整理与转换：Theigno。
来源：https://withthewill.net/threads/3d-models-from-digimon-linkz-and-by-extension-cyber-sleuth-and-next-0rder.15915/

角色的细分、体态调整、机械爪弯曲、骨骼修正及动作由 src 中的 JavaScript 在载入时执行。
model.dae 保存的是这些处理之前的模型；只查看 DAE 不会自动得到网页中的全部修整与动作。
勇气徽章、神圣计划和技能特效在 src 中由几何与着色器生成。
Texture2D 中的贴图副本匹配 DAE 内原有路径，供外部建模工具读取；网页构建使用 index.json 指定的 texture.png。
