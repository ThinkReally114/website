---
title: 逐行拆解PVPUtils的液态玻璃实现
date: 2026-10-04
desc: 逐行解析PVPUtils的所有液态玻璃视觉实现
---

>Github仓库: bakabaicai/PVPUtils

技术栈：**Java + Skija + OpenGL**

逐行解析 PVPUtils 在 Dynamic Island / Keystrokes 等界面元素上叠加 Apple "Liquid Glass" 风格的毛玻璃 + 折射 + 高光效果

( 其实是我的Token太多了所以写了这个文章。。可能有错误请指出)

---

## 0. 速览

所谓"液态玻璃"，本质上不是真的画一块玻璃，而是**把屏幕背后的画面"抠"下来 → 做模糊 + 饱和度增强 → 用一段 GLSL 着色器按圆角矩形的 Signed Distance Field（SDF）做透镜折射和色散 → 再贴回原位**，最后叠上一层半透明色调（tint）、外阴影和一条沿视角方向变化的高光描边

整条管线可以概括为：

```
主帧缓冲 (MC 当前画面)
   │  capture(x, y, w, h, padding)   ← SkiaBlurRenderer 截取背景区域
   ▼
Capture.image (Skia Image)
   │  ImageFilter 链:
   │    sRGB → Linear (伽马校正)
   │    → 饱和度 +1.5 的 vibrancy 矩阵
   │    → 高斯模糊 (sigma)
   │    → Linear → sRGB (回写)
   ▼
离屏 Surface (offscreenSurfaces[slot])
   │  RuntimeEffect LENS_SHADER：
   │    · SDF 算圆角矩形有符号距离
   │    · 斯涅尔定律 (Snell's Law) 算折射偏移
   │    · 7 通道采样做色散 (Chromatic Aberration)
   ▼
Image glass
   │  drawImageRect 贴回主 Canvas
   ▼
+ tint 纯色层
+ drop shadow 外阴影
+ HIGHLIGHT_SHADER 高光描边（角度跟随玩家视角）
```

---

## 1. 类骨架与成员变量（第 13–37 行）

```java
public final class LiquidGlassRenderer {
    private static final LiquidGlassRenderer INSTANCE = new LiquidGlassRenderer();
    private final Paint blurPaint = new Paint().setAntiAlias(true);
    private final Paint blitPaint = new Paint().setAntiAlias(true);
    private final Paint highlightPaint = new Paint().setAntiAlias(true);
    private final Paint shadowPaint = new Paint().setAntiAlias(true);
    private final Paint tintPaint = new Paint().setAntiAlias(true);
```

- **单例模式**：`INSTANCE` 在类加载时创建，整个游戏生命周期只有一个渲染器
- **5 支 Paint**，每支都对应管线里的一个独立阶段，避免互相污染：
  | Paint | 用途 |
  |---|---|
  | `blurPaint` | 把背景图送进离屏 surface 时挂的 `ImageFilter`（透镜 + 模糊链） |
  | `blitPaint` | 把加工好的 `glass` 图贴回主 Canvas |
  | `highlightPaint` | 高光描边，模式会在 STROKE / FILL 之间切换 |
  | `shadowPaint` | 外阴影，挂 `makeDropShadowOnly` |
  | `tintPaint` | 半透明纯色叠加层 |

```java
    private float highlightAngle = (float) (Math.PI * 0.25);
    private static final float BAR_HIGHLIGHT_STROKE = 1.5f;
    private static final float SLOT_HIGHLIGHT_STROKE = 0.75f;
    private static final float SLOT_HIGHLIGHT_ALPHA_SCALE = 0.3f;
    private static final float SLOT_HIGHLIGHT_TAPER = 2.2f;
```

- `highlightAngle`：高光方向，初始 45°（π/4），后面会随玩家 yaw/pitch 平滑插值
- 描边宽度：面板 1.5px，格子 0.75px；格子透明度再乘 0.3，避免抢戏
- `SLOT_HIGHLIGHT_TAPER = 2.2`：格子高光沿切向的高斯衰减强度，越大越有立体感

```java
    private RuntimeEffect lensEffect;
    private RuntimeEffect highlightEffect;
    private ImageFilter glassLinearizeFilter;
    private ImageFilter glassVibrancyFilter;
    private ImageFilter glassBlurFilter;
    private ImageFilter glassEncodeFilter;
    private float glassFilterSigma = Float.NaN;
    private boolean effectsFailed = false;
    private final Surface[] offscreenSurfaces = new Surface[4];
    private final int[] surfaceWidths = { -1, -1, -1, -1 };
    private final int[] surfaceHeights = { -1, -1, -1, -1 };
```

- `RuntimeEffect`：Skia 运行时着色器对象，分别对应透镜 shader 和高光 shader
- 四个 `ImageFilter` 串成一条链（见 §5.3）：线性化 → Vibrancy → 模糊 → 回写
- `glassFilterSigma`：缓存上次使用的模糊半径，sigma 没变就复用整条 filter 链，**避免每帧重建 GPU 资源**
- `effectsFailed`：shader 编译失败后置 true，之后直接走 fallback，不再反复 try
- `offscreenSurfaces[4]`：**4 个离屏 surface 的对象池**。槽位 `slot` 由调用方传入，允许多个 HUD 元素同时渲染而不会在同一帧互相覆盖

---

## 2. 圆角矩形 SDF 工具函数（第 39–68 行）

```glsl
float radiusAt(float2 coord, float4 radii) {
    if (coord.x >= 0.0) {
        if (coord.y <= 0.0) return radii.y;
        else return radii.z;
    } else {
        if (coord.y <= 0.0) return radii.x;
        else return radii.w;
    }
}
```

- 给定一个相对矩形中心的坐标 `coord`，根据它落在哪个象限，返回对应角的圆角半径
- `radii = (左下, 右下, 右上, 左上)`（GLSL 的 float4 分量顺序）。本项目目前四个角用同一个半径，但接口保留了"四角独立"的能力

```glsl
float sdRoundedRect(float2 coord, float2 halfSize, float radius) {
    float2 cornerCoord = abs(coord) - (halfSize - float2(radius));
    float outside = length(max(cornerCoord, float2(0.0))) - radius;
    float inside = min(max(cornerCoord.x, cornerCoord.y), 0.0);
    return outside + inside;
}
```

- 标准的**有符号距离场**（Signed Distance Field）公式：
  - `cornerCoord`：把当前点反射到第一象限后，再往里缩 `radius`，得到"离圆角圆心"的坐标
  - `outside`：在圆角矩形**外面**时，到圆角的距离
  - `inside`：在**里面**时，到最近一条直边的距离（负值）
  - `outside + inside`：合起来得到 SDF —— 内部为负、外部为正、表面为 0

```glsl
float2 gradSdRoundedRect(float2 coord, float2 halfSize, float radius) {
    float2 cornerCoord = abs(coord) - (halfSize - float2(radius));
    if (cornerCoord.x >= 0.0 || cornerCoord.y >= 0.0) {
        float2 m = max(cornerCoord, float2(0.0));
        float len = length(m);
        return len > 1e-5 ? sign(coord) * (m / len) : float2(0.0);
    } else {
        float gradX = step(cornerCoord.y, cornerCoord.x);
        return sign(coord) * float2(gradX, 1.0 - gradX);
    }
}
```

- 求 SDF 的**梯度**（即法线方向）
  - 在圆角区（`cornerCoord` 至少一维为正）：法线就是从圆角圆心指向当前点的单位向量，再乘上 `sign(coord)` 把方向反射回原来的象限
  - 在直边区（两维都 ≤ 0）：用 `step` 判断更靠近哪条边，法线沿 x 或 y 方向。
- 后面折射偏移和高光强度都靠这个梯度

---

## 3. 透镜着色器 `LENS_SHADER`（第 70–169 行）

这是液态玻璃"折射感"的核心

### 3.1 Uniform 声明

```glsl
uniform shader content;          // 被模糊后的背景纹理
uniform float2 size;             // 玻璃面板尺寸（缩放后，像素）
uniform float2 offset;           // 纹理坐标偏移（用于把 padding 对齐）
uniform float4 cornerRadii;      // 四个角半径
uniform float refractionHeight;   // 边缘"透镜厚度"作用的距离
uniform float refractionAmount;   // 最大偏移量
uniform float ior;               // 折射率 (Index of Refraction)
uniform float depthEffect;       // 中心向里的额外弯曲强度
uniform float chromaticAberration;// 色散强度
uniform float slotCount;         // 格子数量（=0 表示整块面板）
uniform float2 slotSize;
uniform float2 slotFirst;
uniform float slotPitch;
uniform float slotRadius;
```

- `content` 是 Skia 的 `shader` 类型，调用 `content.eval(coord)` 就能采样背景。
- 后面一长串 `slot*` 是为"物品栏"这种带格子的面板准备的：每个小格子也有自己的圆角折射。

### 3.2 算 SDF

```glsl
half4 main(float2 coord) {
    float2 halfSize = size * 0.5;
    float2 centeredCoord = (coord + offset) - halfSize;
    float radius = radiusAt(coord + offset, cornerRadii);

    float sd = sdRoundedRect(centeredCoord, halfSize, radius);
    float2 gradCenter = centeredCoord;
    float2 gradHalf = halfSize;
```

- `centeredCoord`：以面板中心为原点的坐标。
- `sd`：当前点到圆角矩形边界的有符号距离。面板内部 `sd < 0`，越靠近边缘 `sd` 越接近 0。

### 3.3 支持格子（Slot）的情况

```glsl
    if (slotCount > 0.5) {
        float2 slotHalf = slotSize * 0.5;
        float best = 1e9;
        float2 bestLocal = float2(0.0);
        for (int i = 0; i < 9; i++) {
            if (float(i) >= slotCount) break;
            float2 slotCenter = slotFirst + slotHalf + float2(float(i) * slotPitch, 0.0) - size * 0.5;
            float2 local = centeredCoord - slotCenter;
            float s = sdRoundedRect(local, slotHalf, slotRadius);
            if (s < best) { best = s; bestLocal = local; }
        }
        if (best < 0.0) {
            sd = best;
            gradCenter = bestLocal;
            gradHalf = slotHalf;
            radius = slotRadius;
        }
    }
```

- 如果当前像素落在某个物品格子内部（`best < 0`），就把 SDF 切换成"相对于该格子"的距离
- 这意味着：**格子的边缘也会产生独立的折射和高光**，看起来像每个小槽位都是一块独立的小玻璃
- 循环最多 9 次（覆盖 9 格 Hotbar 的常见需求），用 `slotCount` 做动态 break

### 3.4 中心直通，边缘起折射

```glsl
    if (-sd >= refractionHeight) {
        return content.eval(coord);
    }
    sd = min(sd, 0.0);
```

- 离边界足够远（`-sd >= refractionHeight`）的像素，**直接原样采样背景**——不做任何扭曲
- 也就是说，只有边缘一圈 `refractionHeight` 厚度的"透镜边"才会折射，中间是平的。这正是真实玻璃的样子：厚边弯曲光线，薄边直通

### 3.5 使用斯涅尔定律（Snell's Law）计算折射

```glsl
    float depth = -sd;
    float xR = clamp(1.0 - depth / refractionHeight, 0.0, 1.0);
    float thetaI = asin(clamp(pow(xR, 2.0), 0.0, 1.0));
    float thetaT = asin(clamp(sin(thetaI) / max(ior, 1.001), 0.0, 1.0));
    float edgeFactor = -tan(thetaT - thetaI);
    float d = edgeFactor * refractionAmount;
```

这段是物理模拟的核心：

- `depth`：当前点距玻璃表面的"虚拟深度"，0 在边缘，`refractionHeight` 在中心
- `xR`：归一化后的位置（边缘=1，中心=0）
- `thetaI = asin(xR²)`：入射角度。`xR²` 让角度在边缘增长更快，模拟透镜球面曲率
- `thetaT = asin(sin(thetaI) / ior)`：**斯涅尔折射定律** `n₁ sinθ₁ = n₂ sinθ₂`，这里假设空气 `n₁=1`，玻璃 `n₂=ior`
- `edgeFactor = -tan(thetaT - thetaI)`：偏折量。空气→玻璃时 `thetaT < thetaI`，所以 `edgeFactor` 为负，后面 `d` 的符号配合方向把背景"推"向玻璃中心
- `d`：最终的采样偏移距离（像素）

### 3.6 实现法线方向 + 中心微弯

```glsl
    float gradRadius = min(radius * 1.5, min(gradHalf.x, gradHalf.y));
    float2 grad = normalize(gradSdRoundedRect(gradCenter, gradHalf, gradRadius)
                          + depthEffect * normalize(gradCenter + float2(1e-5)));
```

- 用 §2 的 `gradSdRoundedRect` 拿到边缘外法线
- 再加一项 `depthEffect * normalize(gradCenter)`：从面板中心向外的径向向量，让整块玻璃的中部也有一点点"向外鼓"的曲率，避免透镜感只停在边缘
- `gradRadius = radius * 1.5`：法线计算时稍微扩大圆角半径，让高光和折射过渡更柔和

### 3.7 色散编写（Chromatic Aberration）

```glsl
    float2 refractedCoord = coord + d * grad;
    float dispersionIntensity = chromaticAberration
            * ((centeredCoord.x * centeredCoord.y) / (halfSize.x * halfSize.y));
    float2 dispersedCoord = d * grad * dispersionIntensity;
    if (dot(dispersedCoord, dispersedCoord) < 0.25) {
        return content.eval(refractedCoord);
    }
```

- `refractedCoord`：基础折射后的采样坐标
- `dispersionIntensity`：按像素位置调制色散强度——`x*y` 在四角最大、中心为 0，**模拟棱镜在边角分光最明显**
- 偏移很小（`< 0.25` 平方像素）就不分光，直接单采样，省性能

```glsl
    half4 color = half4(0.0);
    half4 red     = content.eval(refractedCoord + dispersedCoord);
    color.r += red.r / 3.5;            color.a += red.a / 7.0;
    half4 orange  = content.eval(refractedCoord + dispersedCoord * (2.0/3.0));
    color.r += orange.r / 3.5;         color.g += orange.g / 7.0;    color.a += orange.a / 7.0;
    half4 yellow  = content.eval(refractedCoord + dispersedCoord * (1.0/3.0));
    color.r += yellow.r / 3.5;         color.g += yellow.g / 3.5;     color.a += yellow.a / 7.0;
    half4 green   = content.eval(refractedCoord);
    color.g += green.g / 3.5;          color.a += green.a / 7.0;
    half4 cyan    = content.eval(refractedCoord - dispersedCoord * (1.0/3.0));
    color.g += cyan.g / 3.5;           color.b += cyan.b / 3.0;      color.a += cyan.a / 7.0;
    half4 blue    = content.eval(refractedCoord - dispersedCoord * (2.0/3.0));
    color.b += blue.b / 3.0;           color.a += blue.a / 7.0;
    half4 purple  = content.eval(refractedCoord - dispersedCoord);
    color.r += purple.r / 7.0;         color.b += purple.b / 3.0;    color.a += purple.a / 7.0;
    return color;
```

使用**7 次采样**，沿 `dispersedCoord` 方向排成 R → O → Y → G → C → B → P 的彩虹序列，每次采样只把对应颜色分量累加（R 取 R，G 取 G，B 取 B，中间色按权重混合），再除以 3.5 左右做归一化，这样一条边就会泛出彩虹色的边——这就是"液态玻璃"最标志性的虹彩边缘，透明度 `a` 每次都按不同权重（7.0 或 3.5）累加，避免色散后边缘发虚

---

## 4. 实现高光着色器 `HIGHLIGHT_SHADER`（第 171–198 行）

```glsl
uniform float2 size;
uniform float4 cornerRadii;
uniform float4 color;
uniform float angle;      // 高光方向（弧度）
uniform float falloff;    // 强度衰减指数
uniform float taper;      // 沿切向的高斯衰减
```

```glsl
half4 main(float2 coord) {
    float2 halfSize = size * 0.5;
    float2 centeredCoord = coord - halfSize;
    float radius = radiusAt(coord, cornerRadii);

    float gradRadius = min(radius * 1.5, min(halfSize.x, halfSize.y));
    float2 grad = gradSdRoundedRect(centeredCoord, halfSize, gradRadius);
    float2 normal = float2(cos(angle), sin(angle));
    float d = dot(grad, normal);
    float intensity = pow(abs(d), falloff);
```

- 取 SDF 梯度 `grad`（外法线方向）
- `normal = (cos(angle), sin(angle))`：用户视角方向
- `d = dot(grad, normal)`：法线和视角方向的点积。**法向正对光源的地方 `d ≈ 1`，背对的地方 `d ≈ -1`，侧面 `d ≈ 0`**
- `intensity = |d|^falloff`：正对/背对方向亮，侧面暗。用 `abs` 是为了让上下两条边都有高光（模拟真实玻璃两个表面都反光）

```glsl
    if (taper > 0.0) {
        float2 tangent = float2(-normal.y, normal.x);
        float along = dot(centeredCoord, tangent) / max(halfSize.x, halfSize.y);
        intensity *= exp(-pow(along * taper, 2.0));
    }
    return half4(color * intensity * 0.3);
}
```

- `tangent`：高光方向的垂直方向
- `along`：当前点沿切线方向到面板中心的归一化距离
- `exp(-(along*taper)²)`：**高斯衰减**——高光只在法线正对光源的那一段最亮，向两端迅速衰减成 0，看起来就是"一道斜光划过面板"
- 最终乘 `0.3` 整体压暗，避免过曝

---

## 5. Java 侧关键方法逐段拆解

### 5.1 入口 `renderPanel(...)`（第 215–239 行）

```java
public boolean renderPanel(Minecraft client, float x, float y, float width, float height, float radius,
                           int tintColor, boolean shadow, boolean highlight, float highlightTaper, int slot,
                           SlotGrid grid) {
    if (width <= 0f || height <= 0f) return false;
    if (client == null || client.getWindow() == null || client.getMainRenderTarget() == null) return false;
    int framebufferId = mainFramebufferId(client);
    if (framebufferId == 0) return false;

    SkiaBlurRenderer blur = SkiaBlurRenderer.getInstance();
    Canvas canvas = blur.beginFrame(framebufferId);
    if (canvas == null) return false;
    try {
        DirectContext context = blur.context();
        if (!ensureRuntimeEffects()) return false;
        drawGlass(canvas, context, client, slot, x, y, width, height, radius, tintColor, shadow, highlight, highlightTaper, grid);
        return true;
    } finally {
        blur.endFrame();
    }
}
```

- 一系列空值/尺寸校验，任何一项不满足就直接返回 false（HUD 渲染不能崩游戏）
- `mainFramebufferId(client)`：取 MC 主帧缓冲的 FBO id，让 Skia 直接在 MC 的画面上画
- `blur.beginFrame(framebufferId)`：把 Skia 的 GL 后端绑定到 MC 的帧缓冲，之后拿到的 `Canvas` 画在哪就是哪
- `try/finally`：保证即使 `drawGlass` 抛异常，`endFrame()` 也一定会被调用，避免把 GL 上下文搞坏

### 5.2 核心 `drawGlass(...)`（第 241–285 行）

```java
private void drawGlass(Canvas canvas, DirectContext context, Minecraft client, int slot,
                       float x, float y, float width, float height, float radius,
                       int tintColor, boolean shadow, boolean highlight, float highlightTaper, SlotGrid grid) {
    float blurSigma = Math.max(0.001f, Config.liquidGlassBlur * 10.5f / 2f);
    float padding = Math.max(18f, blurSigma * 2f);

    SkiaBlurRenderer.Capture capture = SkiaBlurRenderer.getInstance().capture(client, x, y, width, height, padding);
    if (capture.image == null) return;
```

- `blurSigma`：把 `Config.liquidGlassBlur`（默认 3）映射成 Skia 高斯模糊的标准差。除以 2 是因为 Skia 的 blur 已经比 Minecraft 的 blur 视觉上更强
- `padding`：向外多截一圈背景，否则模糊边缘会因为采样越界被 clamp 成黑边
- `capture(...)`：从主帧缓冲里把 `(x,y,w,h)` 周围 `padding` 一圈的区域拷成一张 Skia `Image`。这就是"玻璃背后的画面"

```java
    Image glass = buildGlass(context, capture, slot, width, height, radius, blurSigma, padding, grid);
    if (glass == null) { capture.image.close(); return; }

    if (shadow) { renderShadow(canvas, x, y, width, height, radius); }

    float scale = capture.dstW > 0f ? capture.width / capture.dstW : 1f;
    float renderScale = scale * renderPrecision();

    canvas.save();
    try {
        canvas.translate(x, y);
        canvas.clipRRect(RRect.makeXYWH(0, 0, width, height, radius), true);
        canvas.drawImageRect(glass,
                Rect.makeXYWH(padding * renderScale, padding * renderScale, width * renderScale, height * renderScale),
                Rect.makeXYWH(0, 0, width, height),
                SamplingMode.LINEAR, blitPaint, true);

        tintPaint.setColor(tintColor);
        canvas.drawRRect(RRect.makeXYWH(0, 0, width, height, radius), tintPaint);

        if (highlight) {
            renderHighlights(canvas, width, height, radius, highlightTaper, grid);
        }
    } finally {
        canvas.restore();
        glass.close();
        capture.image.close();
    }
}
```

- `buildGlass(...)`：把 `capture.image` 跑完整套滤镜 + 透镜 shader，产出一张处理好的玻璃图。
- `renderShadow(...)`：先画阴影（阴影要在玻璃底下）
- `canvas.save()` + `translate(x,y)`：后续所有绘制都以面板左上角为原点
- `clipRRect(...)`：**裁剪**成圆角矩形，防止玻璃图溢出
- `drawImageRect(...)`：把 `glass` 图按 `padding` 偏移贴回。注意源矩形是 `(padding*renderScale, padding*renderScale, width*renderScale, height*renderScale)`——因为 capture 时多截了 padding 一圈，这里要把它裁掉
- 然后叠 `tintColor` 纯色半透明层
- 最后如果需要高光就调 `renderHighlights`
- `finally` 里把所有 GPU 资源 `close()` 掉——Skija 的 `Image`/`Surface` 是 native 内存，不 close 会泄漏

### 5.3 滤镜链 `buildGlass(...)` 与 `ensureGlassFilters(...)`（第 287–380 行）

```java
private ImageFilter ensureGlassFilters(float sigma) {
    if (glassLinearizeFilter == null) {
        ColorMatrix vibrancy = new ColorMatrix(
                1.5f, 0, 0, 0, 0,
                0, 1.5f, 0, 0, 0,
                0, 0, 1.5f, 0, 0,
                -0.25f, -0.25f, -0.25f, 1, 0);
        glassLinearizeFilter = ImageFilter.makeColorFilter(ColorFilter.getSRGBToLinearGamma(), null);
        glassVibrancyFilter = ImageFilter.makeColorFilter(ColorFilter.makeMatrix(vibrancy), glassLinearizeFilter);
    }
    ...
    glassBlurFilter = ImageFilter.makeBlur(sigma, sigma, FilterTileMode.CLAMP, glassVibrancyFilter, null);
    glassEncodeFilter = ImageFilter.makeColorFilter(ColorFilter.getLinearToSRGBGamma(), glassBlurFilter);
    return glassEncodeFilter;
}
```

滤镜链从右到左执行（Skia 的 ImageFilter 是嵌套的）：

```
输入图
  └─ sRGB → LinearGamma        (glassLinearizeFilter)
       └─ Vibrancy 矩阵 ×1.5   (glassVibrancyFilter)
            └─ Gaussian Blur  (glassBlurFilter, sigma)
                 └─ Linear → sRGB  (glassEncodeFilter)
                      输出
```

为什么要先线性化？
- 人眼对亮度的感知是 gamma 空间的，但**模糊物理上应该在线性光空间做**，否则在深色区域会出现灰边、光晕不对称。
- 所以先 sRGB→Linear，做完模糊再 Linear→sRGB 回写，视觉上更自然。

Vibrancy 矩阵：
- RGB 每个通道乘 1.5 → 饱和度 +50%。
- Alpha 行 `(-0.25, -0.25, -0.25, 1, 0)`：从 RGB 总和里减 0.75，再用 1×α。这是经典的"去灰"做法——**把背景里偏灰的颜色变得更鲜艳**，让毛玻璃下面的字和图案不会糊成一团。

缓存策略：
- `glassLinearizeFilter` / `glassVibrancyFilter` 只建一次（和 sigma 无关）。
- `glassBlurFilter` / `glassEncodeFilter` 在 sigma 变化时才重建，重建前先 `close()` 老的。

### 5.4 透镜 shader 的参数装配 `buildGlass(...)`（节选）

```java
float minSide = Math.min(width, height);
float ior = Math.max(1.001f, Config.liquidGlassIoR);
float refHeight = Math.min(minSide * Math.max(0f, Config.liquidGlassRefractionHeight), radius);
float refAmount = minSide * Math.max(0f, Config.liquidGlassRefractionAmount);
refAmount = Math.min(refAmount, refHeight * 0.9f / Math.max(1f, ior));
```

- `refHeight`：透镜厚度 = 面板短边 × 配置比例，但不能超过圆角半径（否则面板中间也会被扭曲）。
- `refAmount`：最大偏移 = 面板短边 × 配置比例。
- 最后一行 `refAmount ≤ refHeight*0.9/ior`：**防止折射偏移过大导致采样跑到面板外**。物理上，玻璃越厚折射越强，但偏移量受 ior 限制。

```java
RuntimeEffectBuilder builder = new RuntimeEffectBuilder(lensEffect);
builder.setUniform("size", width * scale, height * scale);
builder.setUniform("offset", -padPx, -padPx);
builder.setUniform("cornerRadii", radiusPx, radiusPx, radiusPx, radiusPx);
builder.setUniform("refractionHeight", refHeight * scale);
builder.setUniform("refractionAmount", -refAmount * scale);
...
ImageFilter lensFilter = ImageFilter.makeRuntimeShader(builder, "content", encodeFilter);
```

- 所有尺寸都乘 `scale`（DPI / GUI 缩放精度），保证 shader 内部用的是像素坐标。
- `offset = -padPx`：因为 capture 时多截了 padding，shader 里的 `coord` 要对应回 capture 图的原点。
- `ImageFilter.makeRuntimeShader(builder, "content", encodeFilter)`：把透镜 shader 接到 `encodeFilter` 链上——也就是说，shader 里的 `content.eval(...)` 采样到的已经是**模糊 + vibrancy 之后**的图。

```java
Canvas offCanvas = surface.getCanvas();
offCanvas.clear(0);
blurPaint.setImageFilter(lensFilter);
offCanvas.drawImageRect(capture.image,
        Rect.makeXYWH(0, 0, capture.width, capture.height),
        Rect.makeXYWH(0, 0, reqW, reqH),
        SamplingMode.LINEAR, blurPaint, true);
blurPaint.setImageFilter(null);

context.flush();
Image glass = surface.makeImageSnapshot(IRect.makeXYWH(0, 0, reqW, reqH));
```

- 离屏 surface 先清空。
- 用挂了 `lensFilter` 的 `blurPaint` 把 `capture.image` 画上去——Skia 会自动把 `lensFilter` 应用到这幅图上。
- `context.flush()`：强制把 GPU 命令刷完，保证下一步 `makeImageSnapshot` 拿到的是完整结果。
- 返回 surface 的快照 `Image`，后面贴回主 canvas。

### 5.5 高光与视角跟随（第 386–468 行）

```java
private void renderHighlights(Canvas canvas, float width, float height, float radius, float taper, SlotGrid grid) {
    if (highlightEffect == null) return;
    float alpha = Config.hudTheme == Config.HudTheme.LIGHT ? 0.55f : 0.7f;
    Shader barShader = makeHighlightShader(width, height, radius, taper, alpha);
    try {
        highlightPaint.setShader(barShader);
        styleHighlightStroke(BAR_HIGHLIGHT_STROKE);
        canvas.drawRRect(RRect.makeXYWH(0, 0, width, height, radius), highlightPaint);
        if (grid != null) drawSlotHighlights(canvas, grid, alpha);
    } finally {
        resetHighlightPaint();
        barShader.close();
    }
}
```

- 亮色主题用 0.55 alpha，暗色主题用 0.7。
- `styleHighlightStroke` 把 paint 切成 STROKE 模式、PLUS 混合——这样画出来的高光只在描边上发光，不填实。

```java
private void styleHighlightStroke(float strokeWidth) {
    highlightPaint.setMode(PaintMode.STROKE);
    highlightPaint.setStrokeWidth(strokeWidth);
    highlightPaint.setBlendMode(BlendMode.PLUS);
}
```

- `BlendMode.PLUS`：加法混合，亮的地方叠上去更亮。

```java
private float updateHighlightAngle(Minecraft client) {
    float target = (float) (Math.PI * 0.25);
    if (Config.liquidGlassHighlightFollowView && client.player != null) {
        target -= (float) Math.toRadians(client.player.getYRot());
        target += (float) Math.toRadians(client.player.getXRot()) * 0.5f;
    }
    float delta = wrapAngle(target - highlightAngle);
    highlightAngle = wrapAngle(highlightAngle + delta * 0.2f);
    return highlightAngle;
}
```

- 高光方向 = 初始 45° - 玩家水平视角 + 玩家俯仰角 × 0.5。
- 也就是说：**你转头看哪里，高光就跟着转到哪里**，像玻璃真的在反射你身后的光源。
- `delta * 0.2f`：每 tick 只追 20%，做平滑插值，避免一转头高光就"啪"地跳过去。
- `wrapAngle`：把角度归一化到 `(-π, π]`，避免 359° → 1° 时绕远路。

### 5.6 外阴影（第 470–477 行）

```java
private void renderShadow(Canvas canvas, float x, float y, float width, float height, float radius) {
    int color = Config.hudTheme == Config.HudTheme.LIGHT ? 0x1A000000 : 0x38000000;
    ImageFilter shadow = ImageFilter.makeDropShadowOnly(0, 4f, 8f, 8f, color);
    shadowPaint.setImageFilter(shadow);
    canvas.drawRRect(RRect.makeXYWH(x, y, width, height, radius), shadowPaint);
    shadowPaint.setImageFilter(null);
    shadow.close();
}
```

- `makeDropShadowOnly(dx=0, dy=4, sigmaX=8, sigmaY=8, color)`：只画阴影不画实体——阴影向下偏 4px，模糊半径 8px。
- 亮色主题用 `0x1A000000`（10% 不透明黑），暗色主题用 `0x38000000`（22% 不透明黑）。

### 5.7 离屏 surface 对象池（第 483–495 行）

```java
private void ensureOffscreenSurface(DirectContext context, int slot, int reqW, int reqH) {
    if (offscreenSurfaces[slot] != null && surfaceWidths[slot] >= reqW && surfaceHeights[slot] >= reqH) return;

    if (offscreenSurfaces[slot] != null) {
        offscreenSurfaces[slot].close();
        offscreenSurfaces[slot] = null;
    }

    ImageInfo info = new ImageInfo(reqW, reqH, ColorType.RGBA_8888, ColorAlphaType.PREMUL, ColorSpace.getSRGB());
    offscreenSurfaces[slot] = Surface.makeRenderTarget(context, false, info);
    surfaceWidths[slot] = reqW;
    surfaceHeights[slot] = reqH;
}
```

- 只有当请求的尺寸比现有 surface 大时才重建，否则复用。
- `PREMUL`：预乘 alpha，透明度混合更正确。
- `ColorSpace.getSRGB()`：显式指定 sRGB 色彩空间，避免 Skia 默认走线性造成颜色偏差。

### 5.8 资源销毁 `destroy()`（第 521–553 行）

- 游戏退出 / mod 卸载时调用。
- 依次关闭所有 surface、RuntimeEffect、ImageFilter，把引用置 null。
- Skija 的 `close()` 不是 Java GC，是直接释放 native GPU 资源，**不 close 就会显存泄漏**。

---

## 6. 可调参数速查（`Config.java`）

| 参数 | 默认 | 作用 |
|---|---|---|
| `liquidGlassBlur` | 3.0 | 模糊强度（映射到 sigma ≈ 15.75） |
| `liquidGlassRefractionHeight` | 0.25 | 透镜厚度占短边比例 |
| `liquidGlassRefractionAmount` | 0.15 | 最大折射偏移占短边比例 |
| `liquidGlassIoR` | 1.5 | 折射率（玻璃典型 1.5） |
| `liquidGlassDepthEffect` | 0.3 | 中心径向额外弯曲强度 |
| `liquidGlassDispersion` | 1.0 | 彩虹色散强度 |
| `liquidGlassRenderPrecision` | 1.0 | 渲染精度（0.5 ~ 2.0，越大越清晰越贵） |
| `liquidGlassHighlight` | true | 是否画高光描边 |
| `liquidGlassHighlightFollowView` | true | 高光是否跟随玩家视角 |
| `liquidGlassShadow` | true | 是否画外阴影 |

---

## 7. 为什么这么设计？

1. **为什么要"先 capture 再模糊再贴回"，而不是直接在主 canvas 上画 blur？**

   因为毛玻璃需要采样自己身后的画面。MC 的 HUD 是在世界渲染完之后画的，所以必须先把当前帧缓冲的对应区域读出来（`capture`），再处理，再贴回去

2. **为什么要 4 个 offscreen surface 槽位？**

   一帧里可能同时有多个 HUD 元素要画液态玻璃（比如 Keystrokes + TargetHud + Hotbar）。如果共用一个 surface，后画的会覆盖先画的中间结果。对象池按 `slot` 隔离，互不干扰。

3. **为什么要在 Linear 空间做模糊？**

   sRGB 是 gamma 编码的，人眼对暗部更敏感。直接在 sRGB 空间做高斯模糊会让暗部光晕过大、亮部光晕过小，看起来"脏"。转到 Linear 做完再转回来，边缘干净很多。

4. **为什么色散要采 7 次而不是 3 次？**

   3 次（R/G/B）会产生生硬的色边。7 次覆盖 R→P 的完整光谱，中间过渡用橙色、黄色、青色做权重混合，虹彩边缘才会像真实棱镜那样柔和。代价是 7 次纹理采样——在边缘一圈才启用，中心直通单采样，整体开销可控。

5. **为什么高光角度要做插值？**

   玩家转头是连续动作，直接把角度设成当前 yaw 会让高光"一卡一卡"。每帧追 20%（`delta * 0.2`），3~5 帧就追上目标，视觉上是平滑滑过去的。

---

## 8. 调用方怎么用？

最简单的用法：

```java
LiquidGlassRenderer.getInstance().renderPanel(
        minecraft,
        x, y,            // 面板左上角
        width, height,   // 尺寸
        radius,          // 圆角
        LiquidGlassRenderer.panelTint(),  // 推荐的半透明色调
        /* shadow   = */ true,
        /* highlight= */ true,
        /* taper    = */ 0.0f,
        /* slot     = */ slotIndex   // 0~3，多个 HUD 元素分配不同槽位
);
```

如果要给物品栏这种"格子群"加独立折射，多传一个 `SlotGrid`：

```java
LiquidGlassRenderer.SlotGrid grid = new LiquidGlassRenderer.SlotGrid(
        /* count  = */ 9,
        /* x      = */ slotX,
        /* y      = */ slotY,
        /* pitch  = */ slotPitch,
        /* size   = */ slotSize,
        /* radius = */ slotRadius
);
renderPanel(..., /* slot = */ 0, grid);
```

---

## 9. 总结

这块"液态玻璃"= **把屏幕背后画面抠出来 → 在线性空间做 vibrancy + 高斯模糊 → 用 SDF + 斯涅尔定律在圆角边缘做透镜折射 → 用 7 通道采样做虹彩色散 → 贴回原位并叠 tint、阴影、跟随视角的高光描边**，没有任何黑魔法，全是图形学基础公式（SDF、Snell's Law、Chromatic Aberration、Gamma Correction）在 Skija 上的一次工整落地，几乎是 PVPUtils 里接近优秀的后端渲染。
