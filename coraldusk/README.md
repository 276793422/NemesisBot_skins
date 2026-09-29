# CoralDusk

暖珊瑚观感皮肤（源自 new_ui 设计语言），纯 CSS 换色包，明暗双变体。

## 规格

| 项 | 值 |
|---|---|
| id | `coraldusk` |
| 类型 | theme（CSS-only，无 structure） |
| 品牌色 | 珊瑚 `#E8705A` / hover `#F08A78` |
| 暗色基底 | 暖深空灰蓝 `#1A1D23` / `#1E222A` / `#252A33` / surface `#2D333D` |
| 亮色基底 | 暖白 `#F7F5F2` / `#FFFFFF` / `#F0EDE8` |
| 状态色 | pastel：`#6DD89C` / `#E87A7A` / `#E8C87A` / `#7AA8E8` |
| 圆角 | 8 / 12 / 16 / 20 |
| 阴影 | 分层柔和五档（暗深亮浅） |
| 动效 | spring `cubic-bezier(.34,1.56,.64,1)` + out `cubic-bezier(.16,1,.3,1)`，200/300/500ms |
| 侧栏 | 260px |

## 点覆盖（宿主 hover 基线是平的，上浮感由此交付）

- `.btn:hover` 上浮 1px + `shadow-sm`；`:active` 回位（spring 缓动）
- `.btn-primary:hover` 珊瑚光晕 `0 4px 12px rgba(232,112,90,.25)`
- `.card:hover` 浮起 2px + `shadow-md`
- `.sidebar-logo h1` 珊瑚→暖橙渐变字
- 滚动条 thumb 按明暗各给可见度档（边框转透明度白后默认 thumb 太淡）

## 使用

```bash
bash dev/build.sh          # 或 Windows: dev\build.bat
# 产物 dist/coraldusk.nbskin 放到 exe 同级 skins/ 目录
# Dashboard → 设置 → 皮肤 → 设为默认观感（免重启热切）
```

## 诚实边界

- 字体度量沿用宿主（Inter / Geist Mono + 现有字号阶梯）——new_ui 的字号放大未跟随，避免密集视图破版。
- echarts 画布、xterm 终端、≤768px 移动端骨架不在射程；个别视图裸色值与新色系冲突时按截图逐点补。
- 纯观感包：不改布局结构、不带脚本（脚本皮肤能力见 coraldusk-full / P2 阶段）。
