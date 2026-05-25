# bleed

> Tiny CSS utilities for fixed headers and footers that seamlessly tint the iOS Safari status bar & home indicator — without hitting WebKit's `backdrop-filter` safe-area clipping bug.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/bleed.svg?color=blue)](https://www.npmjs.com/package/bleed)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38BDF8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

[**English**](#english) ・ [**Español**](#español) ・ [**日本語**](#日本語) ・ [**台灣華語**](#台灣華語)

> 🎮 **[Live Interactive Demo →](https://cverinc.github.io/bleed/)**

---

## English

### 📌 Overview

`bleed` is a lightweight utility designed to fix the iOS Safari status bar clipping bug when utilizing `backdrop-filter` on top-fixed (`position: fixed; top: 0`) elements with `viewport-fit=cover`.

#### 🔴 The Problem
When combining `position: fixed`, `top: 0`, safe-area-inset padding, and `backdrop-filter` on iOS Safari, WebKit clips the filter sampling region at the safe-area boundary. This leaves the status bar/notch area transparent or filled with the page body background, rather than the banner's background.

#### 🟢 The Solution
`bleed` disables `backdrop-filter` on the outer fixed container and utilizes an opaque background. This ensures that the painted background surface extends fully into the status bar area. If a frosted glass effect is desired, the blur is applied to an inner child element instead of the main wrapper.

### ✨ Features
* 📱 **Top & Bottom Safe Area Tinting**: Seamlessly bleeds fixed header and footer backgrounds into the iOS status bar and home indicator.
* 🛠 **Multi-Framework Support**: Official integrations for Tailwind CSS, React, Vue, Svelte, and UnoCSS.
* 📐 **TypeScript Ready**: Full `.d.ts` declarations for all modules — enjoy autocomplete and type safety out of the box.
* ⚡ **JS Safe Area API**: `getSafeAreaInsets()` dynamically returns the device's safe area insets in pixels.
* ⚙️ **Clipping Prevention**: Overrides outer `backdrop-filter` declarations to avoid rendering glitches on iOS.

### 🏗 File Structure

| File | Purpose |
|---|---|
| `src/index.css` | Vanilla CSS (`.bleed-top`, `.bleed-bottom`, `.bleed-inner-blur`) |
| `src/tailwind-plugin.js` | Tailwind CSS plugin |
| `src/unocss.js` | UnoCSS preset |
| `src/react.js` | React components (`BleedTop`, `BleedBottom`, `BleedInnerBlur`) |
| `src/vue.js` | Vue 3 components (`BleedTop`, `BleedBottom`, `BleedInnerBlur`) |
| `src/svelte.js` | Svelte actions (`bleedTop`, `bleedBottom`, `bleedInnerBlur`) |
| `src/utils.js` | JS safe area detector (`getSafeAreaInsets()`) |
| `src/*.d.ts` | TypeScript type declarations for every module |
| `demo/index.html` | Interactive visual showcase & iOS simulator |

### 🚀 Installation & Usage

#### 1. Install Package
```bash
npm install bleed
```

#### 2. Meta Tag Setup
Make sure your page's viewport metadata includes `viewport-fit=cover`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

#### 3. Choose Your Framework

<details>
<summary><b>🎨 Option A: Vanilla CSS</b></summary>

Import the stylesheet at your application entry point:
```javascript
import 'bleed/style';
```

Apply the classes:
```html
<div class="bleed-top emergency-bar">
  <strong>Notice:</strong> We are undergoing scheduled system maintenance.
</div>
```
```css
.emergency-bar {
  background: #b91c1c;
  color: #fff;
  padding-right: 16px;
  padding-bottom: 8px;
  padding-left: 16px;
}
```
</details>

<details>
<summary><b>⚡ Option B: Tailwind CSS</b></summary>

Add the plugin to your `tailwind.config.js`:
```javascript
module.exports = {
  content: ['./src/**/*.{html,js,ts,jsx,tsx,vue,svelte}'],
  plugins: [require('bleed')],
};
```

Combine `.bleed-top` with an opaque background class:
```html
<div class="bleed-top bg-red-700 text-white px-4 pb-2" role="status">
  <p class="text-sm font-medium">Notice: We are undergoing scheduled system maintenance.</p>
</div>
```
</details>

<details>
<summary><b>⚛️ Option C: React / Next.js</b></summary>

Import the components:
```jsx
import { BleedTop, BleedInnerBlur } from 'bleed/react';
import 'bleed/style'; // (If not using Tailwind/UnoCSS)

export default function Banner() {
  return (
    <BleedTop className="bg-red-700 text-white px-4 pb-2">
      <p className="text-sm font-medium">Undergoing scheduled maintenance.</p>
    </BleedTop>
  );
}
```
</details>

<details>
<summary><b>🟢 Option D: Vue 3</b></summary>

Import the components:
```html
<template>
  <BleedTop class="bg-red-700 text-white px-4 pb-2">
    <p class="text-sm font-medium">Undergoing scheduled maintenance.</p>
  </BleedTop>
</template>

<script setup>
import { BleedTop } from 'bleed/vue';
import 'bleed/style'; // (If not using Tailwind/UnoCSS)
</script>
```
</details>

<details>
<summary><b>🧡 Option E: Svelte</b></summary>

Use Svelte actions for ultimate flexibility:
```html
<script>
  import { bleedTop } from 'bleed/svelte';
  import 'bleed/style'; // (If not using Tailwind/UnoCSS)
</script>

<div use:bleedTop class="bg-red-700 text-white px-4 pb-2">
  <p class="text-sm font-medium">Undergoing scheduled maintenance.</p>
</div>
```
</details>

<details>
<summary><b>📦 Option F: UnoCSS</b></summary>

Add the preset to your `uno.config.ts`:
```typescript
import { defineConfig } from 'unocss';
import presetBleed from 'bleed/unocss';

export default defineConfig({
  presets: [
    presetBleed(),
    // other presets...
  ],
});
```
Then use `.bleed-top` directly in your markup.
</details>

### ⚙️ API Reference

* **`.bleed-top` / `<BleedTop>` / `use:bleedTop`**
  Positions an element at the top of the viewport with safe-area-aware padding (`calc(8px + env(safe-area-inset-top, 0px))`) and disables `backdrop-filter` on the wrapper to prevent clipping.
* **`.bleed-bottom` / `<BleedBottom>` / `use:bleedBottom`**
  Same concept for the bottom edge — extends the footer background into the home indicator area with `env(safe-area-inset-bottom)`.
* **`.bleed-inner-blur` / `<BleedInnerBlur>` / `use:bleedInnerBlur`**
  Applies frosted glass styling (`blur(10px) saturate(140%)`) to an inner element.
* **`getSafeAreaInsets()`** _(from `bleed/utils`)_
  Returns `{ top, bottom, left, right }` in pixels. SSR-safe (returns zeros on server).
  ```javascript
  import { getSafeAreaInsets } from 'bleed/utils';
  const insets = getSafeAreaInsets();
  console.log(`Status bar: ${insets.top}px, Home indicator: ${insets.bottom}px`);
  ```

---

## Español

### 📌 Resumen

`bleed` es una utilidad ligera diseñada para solucionar el error de renderizado en la barra de estado de iOS Safari al usar `backdrop-filter` en elementos con posicionamiento fijo superior (`position: fixed; top: 0`) y `viewport-fit=cover`.

#### 🔴 El Problema
Al combinar `position: fixed`, `top: 0`, relleno basado en safe-area-inset y `backdrop-filter` en iOS Safari, WebKit recorta la región de muestreo del filtro en el límite del área segura (Safe Area). Esto hace que la barra de estado o la zona de la pestaña (notch) quede transparente o pintada con el fondo del body de la página, en lugar de mostrar el fondo de la barra de anuncios.

#### 🟢 La Solución
`bleed` desactiva el `backdrop-filter` en el contenedor externo fijo y utiliza un fondo opaco. Esto asegura que la superficie del fondo pintado se extienda completamente bajo la barra de estado. Si se desea un efecto de cristal esmerilado (frosted glass), el desenfoque (blur) se aplica a un elemento hijo interno en lugar del contenedor principal.

### ✨ Características
* 📱 **Teñido Superior e Inferior del Área Segura**: Extiende de forma automática el fondo de barras fijas (header y footer) hacia la barra de estado y el indicador de inicio de iOS.
* 🛠 **Compatibilidad Multi-Framework**: Integraciones oficiales para Tailwind CSS, React, Vue 3, Svelte y UnoCSS.
* 📐 **Listo para TypeScript**: Declaraciones `.d.ts` completas para todos los módulos.
* ⚡ **API JS de Área Segura**: `getSafeAreaInsets()` devuelve dinámicamente los insets del área segura del dispositivo en píxeles.
* ⚙️ **Prevención de Recortes**: Anula las declaraciones externas de `backdrop-filter` para evitar glitches visuales en iOS.

### 🏗 Estructura de Archivos
(Consulte la tabla de la sección en inglés para más detalles)

### 🚀 Instalación y Uso

#### 1. Instalar Paquete
```bash
npm install bleed
```

#### 2. Configuración de Meta Tag
Asegúrese de que el viewport de su página web incluya `viewport-fit=cover`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

#### 3. Elige tu Framework

<details>
<summary><b>🎨 Opción A: CSS Puro (Vanilla CSS)</b></summary>

Importe la hoja de estilos en el punto de entrada de la aplicación:
```javascript
import 'bleed/style';
```

Aplique las clases:
```html
<div class="bleed-top emergency-bar">
  <strong>Aviso:</strong> Estamos realizando tareas de mantenimiento programadas.
</div>
```
```css
.emergency-bar {
  background: #b91c1c;
  color: #fff;
  padding-right: 16px;
  padding-bottom: 8px;
  padding-left: 16px;
}
```
</details>

<details>
<summary><b>⚡ Opción B: Tailwind CSS</b></summary>

Agregue el plugin a su archivo `tailwind.config.js`:
```javascript
module.exports = {
  content: ['./src/**/*.{html,js,ts,jsx,tsx,vue,svelte}'],
  plugins: [require('bleed')],
};
```

Combine `.bleed-top` con una clase de fondo opaco de Tailwind:
```html
<div class="bleed-top bg-red-700 text-white px-4 pb-2" role="status">
  <p class="text-sm font-medium">Aviso: Estamos realizando tareas de mantenimiento programadas.</p>
</div>
```
</details>

<details>
<summary><b>⚛️ Opción C: React / Next.js</b></summary>

Importe los componentes:
```jsx
import { BleedTop } from 'bleed/react';
import 'bleed/style'; // (Si no usa Tailwind o UnoCSS)

export default function Banner() {
  return (
    <BleedTop className="bg-red-700 text-white px-4 pb-2">
      <p className="text-sm font-medium">Mantenimiento de sistema en curso.</p>
    </BleedTop>
  );
}
```
</details>

<details>
<summary><b>🟢 Opción D: Vue 3</b></summary>

Importe los componentes:
```html
<template>
  <BleedTop class="bg-red-700 text-white px-4 pb-2">
    <p class="text-sm font-medium">Mantenimiento de sistema en curso.</p>
  </BleedTop>
</template>

<script setup>
import { BleedTop } from 'bleed/vue';
import 'bleed/style'; // (Si no usa Tailwind o UnoCSS)
</script>
```
</details>

<details>
<summary><b>🧡 Opción E: Svelte</b></summary>

Use las acciones de Svelte para máxima flexibilidad:
```html
<script>
  import { bleedTop } from 'bleed/svelte';
  import 'bleed/style'; // (Si no usa Tailwind o UnoCSS)
</script>

<div use:bleedTop class="bg-red-700 text-white px-4 pb-2">
  <p class="text-sm font-medium">Mantenimiento de sistema en curso.</p>
</div>
```
</details>

<details>
<summary><b>📦 Opción F: UnoCSS</b></summary>

Agregue el preset a su archivo `uno.config.ts`:
```typescript
import { defineConfig } from 'unocss';
import presetBleed from 'bleed/unocss';

export default defineConfig({
  presets: [
    presetBleed(),
  ],
});
```
Luego, use la clase `.bleed-top` directamente en sus etiquetas.
</details>

### ⚙️ Referencia de la API

* **`.bleed-top` / `<BleedTop>` / `use:bleedTop`**
  Posiciona el elemento en la parte superior del viewport con relleno dinámico del área segura (`calc(8px + env(safe-area-inset-top, 0px))`) y deshabilita `backdrop-filter` en el contenedor para evitar el recorte visual.
* **`.bleed-bottom` / `<BleedBottom>` / `use:bleedBottom`**
  Mismo concepto para el borde inferior — extiende el fondo del footer hacia el área del indicador de inicio con `env(safe-area-inset-bottom)`.
* **`.bleed-inner-blur` / `<BleedInnerBlur>` / `use:bleedInnerBlur`**
  Aplica un estilo de cristal esmerilado (`blur(10px) saturate(140%)`) a un elemento interno.
* **`getSafeAreaInsets()`** _(de `bleed/utils`)_
  Devuelve `{ top, bottom, left, right }` en píxeles. Compatible con SSR.

---

## 日本語

### 📌 概要

`bleed` は、iOS Safari 上で固定配置（`position: fixed; top: 0`）されたアナウンスバー等のヘッダーが、`backdrop-filter` の使用時にステータスバー領域（ノッチ部分）でクリッピングされる WebKit のバグを解決するための軽量ユーティリティです。

#### 🔴 課題
iOS で `viewport-fit=cover` と `position: fixed` に加え `backdrop-filter: blur(...)` を併用すると、WebKit の仕様によりフィルタのサンプリング領域がセーフエリア境界でクリップされ、ステータスバー領域の背景が描画されずにページ背景が露出してしまいます。

#### 🟢 解決策
`bleed` は、外側の固定親要素で `backdrop-filter` を強制的に無効化し、不透明（Opaque）な背景色を指定することで、ステータスバー領域まで背景色を綺麗に「染める（bleed）」ことができます。すりガラス効果が必要な場合は、内側の別レイヤーにぼかしを適用します。

### ✨ 主な機能
* 📱 **上下セーフエリアの自動染色**：ヘッダーとフッターの背景をステータスバー・ホームインジケーター領域まで一体化させます。
* 🛠 **マルチフレームワーク対応**：Tailwind CSS、React、Vue 3、Svelte、UnoCSS に公式対応。
* 📐 **TypeScript 対応**：全モジュールに完全な `.d.ts` 型定義を提供。
* ⚡ **JS セーフエリア API**：`getSafeAreaInsets()` でデバイスのセーフエリアをピクセル単位で動的取得。
* ⚙️ **クリッピング防止**：親要素の `backdrop-filter` を強制的に無効化し、表示崩れを防ぎます。

### 🏗 ファイル構成
（Englishセクションの表と同様）

### 🚀 導入手順

#### 1. インストール
```bash
npm install bleed
```

#### 2. Viewport の設定
HTML の `<head>` に `viewport-fit=cover` が設定されていることを確認してください。
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

#### 3. フレームワークごとの使い方

<details>
<summary><b>🎨 方法 A: Vanilla CSS での使用</b></summary>

エントリファイルで CSS をインポートします：
```javascript
import 'bleed/style';
```

HTML でクラスを付与します：
```html
<div class="bleed-top emergency-bar">
  <strong>お知らせ：</strong> 現在システムメンテナンス中です。
</div>
```
</details>

<details>
<summary><b>⚡ 方法 B: Tailwind CSS での使用</b></summary>

`tailwind.config.js` にプラグインを追加します：
```javascript
module.exports = {
  content: ['./src/**/*.{html,js,ts,jsx,tsx,vue,svelte}'],
  plugins: [require('bleed')],
};
```

不透明な背景色と合わせて `.bleed-top` を適用します：
```html
<div class="bleed-top bg-red-700 text-white px-4 pb-2" role="status">
  <p class="text-sm font-medium">お知らせ：現在システムメンテナンス中です。</p>
</div>
```
</details>

<details>
<summary><b>⚛️ 方法 C: React / Next.js</b></summary>

コンポーネントをインポートします：
```jsx
import { BleedTop } from 'bleed/react';
import 'bleed/style'; // (Tailwind/UnoCSS を使わない場合)

export default function Banner() {
  return (
    <BleedTop className="bg-red-700 text-white px-4 pb-2">
      <p className="text-sm font-medium">現在システムメンテナンス中です。</p>
    </BleedTop>
  );
}
```
</details>

<details>
<summary><b>🟢 方法 D: Vue 3</b></summary>

コンポーネントをインポートします：
```html
<template>
  <BleedTop class="bg-red-700 text-white px-4 pb-2">
    <p class="text-sm font-medium">現在システムメンテナンス中です。</p>
  </BleedTop>
</template>

<script setup>
import { BleedTop } from 'bleed/vue';
import 'bleed/style'; // (Tailwind/UnoCSS を使わない場合)
</script>
```
</details>

<details>
<summary><b>🧡 方法 E: Svelte</b></summary>

便利な Svelte Action を使用します：
```html
<script>
  import { bleedTop } from 'bleed/svelte';
  import 'bleed/style'; // (Tailwind/UnoCSS を使わない場合)
</script>

<div use:bleedTop class="bg-red-700 text-white px-4 pb-2">
  <p class="text-sm font-medium">現在システムメンテナンス中です。</p>
</div>
```
</details>

<details>
<summary><b>📦 方法 F: UnoCSS</b></summary>

`uno.config.ts` にプリセットを追加します：
```typescript
import { defineConfig } from 'unocss';
import presetBleed from 'bleed/unocss';

export default defineConfig({
  presets: [
    presetBleed(),
  ],
});
```
その後、マークアップで直接 `.bleed-top` クラスを使用できます。
</details>

### ⚙️ API 仕様

* **`.bleed-top` / `<BleedTop>` / `use:bleedTop`**
  要素を画面最上部に固定し、セーフエリアを考慮した上部余白（`calc(8px + env(safe-area-inset-top, 0px))`）を設定、外側の `backdrop-filter` を無効化します。
* **`.bleed-bottom` / `<BleedBottom>` / `use:bleedBottom`**
  下端も同様 — フッター背景をホームインジケーター領域まで `env(safe-area-inset-bottom)` で拡張します。
* **`.bleed-inner-blur` / `<BleedInnerBlur>` / `use:bleedInnerBlur`**
  すりガラス効果が必要な場合、内部の子要素に適用します。
* **`getSafeAreaInsets()`** _(`bleed/utils` から)_
  `{ top, bottom, left, right }` をピクセル単位で返します。SSR 環境でも安全に使用可能。

---

## 台灣華語

### 📌 概要

`bleed` 是一個專門解決 iOS Safari 頂部固定橫幅（top-fixed banner）在與 `backdrop-filter` 搭配時，狀態列（Status Bar / 瀏海區）背景裁切 Bug 的輕量化工具。

#### 🔴 問題點
當你在 iOS 網頁上同時使用 `viewport-fit=cover`、`position: fixed; top: 0`、安全區內距與 `backdrop-filter: blur(...)` 時，WebKit 瀏覽器會在 Safe Area 邊界剪裁 Filter 採樣區，導致狀態列區域無法正常被橫幅背景染色，留下網頁底色。

#### 🟢 解決方案
`bleed` 強制在外層固定定位容器上停用 `backdrop-filter`，改用不透明的背景色（或漸層色），讓瀏覽器能正確將背景繪製並染色至狀態列區。若需要毛玻璃效果，可將模糊效果套用在內層的子容器中。

### ✨ 主要功能
* 📱 **上下安全區自動染色**：將固定橫幅與底部操作列的背景延伸至狀態列與 Home Indicator 區域。
* 🛠 **多框架原生支援**：官方整合了 Tailwind CSS、React、Vue 3、Svelte 以及 UnoCSS。
* 📐 **TypeScript 支援**：所有模組皆附有完整的 `.d.ts` 型別定義，享受自動補全與型別安全。
* ⚡ **JS 安全區域 API**：`getSafeAreaInsets()` 動態回傳裝置的安全區域內距（像素值）。
* ⚙️ **防裁切設計**：預設封鎖外層 `backdrop-filter`，防止 WebKit 渲染引擎在 notch 區產生斷層。

### 🏗 檔案結構
（與英文版檔案結構表相同）

### 🚀 安裝與使用

#### 1. 安裝套件
```bash
npm install bleed
```

#### 2. 設定 Viewport
確保您的 HTML `<head>` 中包含 `viewport-fit=cover`：
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

#### 3. 選擇您的開發框架

<details>
<summary><b>🎨 方法 A：Vanilla CSS</b></summary>

在應用程式入口處引入 CSS：
```javascript
import 'bleed/style';
```

在 HTML 套用樣式類別：
```html
<div class="bleed-top emergency-bar">
  <strong>系統通知：</strong> 服務維護中，部分功能可能延遲。
</div>
```
```css
.emergency-bar {
  background: #b91c1c;
  color: #fff;
  padding-right: 16px;
  padding-bottom: 8px;
  padding-left: 16px;
}
```
</details>

<details>
<summary><b>⚡ 方法 B：Tailwind CSS 插件</b></summary>

在 `tailwind.config.js` 中載入插件：
```javascript
module.exports = {
  content: ['./src/**/*.{html,js,ts,jsx,tsx,vue,svelte}'],
  plugins: [require('bleed')],
};
```

使用 `.bleed-top` 搭配不透明背景：
```html
<div class="bleed-top bg-red-700 text-white px-4 pb-2 shadow-md" role="status">
  <div class="mx-auto flex max-w-5xl items-center justify-between">
    <p class="text-sm font-medium">系統通知：服務維護中，部分功能可能延遲。</p>
  </div>
</div>
```
</details>

<details>
<summary><b>⚛️ 方法 C：React / Next.js</b></summary>

引入 React 元件：
```jsx
import { BleedTop } from 'bleed/react';
import 'bleed/style'; // (若不使用 Tailwind/UnoCSS)

export default function Banner() {
  return (
    <BleedTop className="bg-red-700 text-white px-4 pb-2">
      <p className="text-sm font-medium">系統通知：服務維護中，部分功能可能延遲。</p>
    </BleedTop>
  );
}
```
</details>

<details>
<summary><b>🟢 方法 D：Vue 3</b></summary>

引入 Vue 元件：
```html
<template>
  <BleedTop class="bg-red-700 text-white px-4 pb-2">
    <p class="text-sm font-medium">系統通知：服務維護中，部分功能可能延遲。</p>
  </BleedTop>
</template>

<script setup>
import { BleedTop } from 'bleed/vue';
import 'bleed/style'; // (若不使用 Tailwind/UnoCSS)
</script>
```
</details>

<details>
<summary><b>🧡 方法 E：Svelte</b></summary>

使用方便的 Svelte Action 語法：
```html
<script>
  import { bleedTop } from 'bleed/svelte';
  import 'bleed/style'; // (若不使用 Tailwind/UnoCSS)
</script>

<div use:bleedTop class="bg-red-700 text-white px-4 pb-2">
  <p class="text-sm font-medium">系統通知：服務維護中，部分功能可能延遲。</p>
</div>
```
</details>

<details>
<summary><b>📦 方法 F：UnoCSS</b></summary>

在 `uno.config.ts` 中載入預設集（Preset）：
```typescript
import { defineConfig } from 'unocss';
import presetBleed from 'bleed/unocss';

export default defineConfig({
  presets: [
    presetBleed(),
  ],
});
```
接著即可直接在 markup 中使用 `.bleed-top` 類別。
</details>

### ⚙️ API / 用法說明

* **`.bleed-top` / `<BleedTop>` / `use:bleedTop`**
  將元素固定於視窗頂部，自動計算安全區內距（`calc(8px + env(safe-area-inset-top, 0px))`），並禁用外層的 `backdrop-filter` 避免 WebKit 裁切。
* **`.bleed-bottom` / `<BleedBottom>` / `use:bleedBottom`**
  同樣概念應用於底部 — 將 Footer 背景延伸至 Home Indicator 區域，使用 `env(safe-area-inset-bottom)`。
* **`.bleed-inner-blur` / `<BleedInnerBlur>` / `use:bleedInnerBlur`**
  若仍需要毛玻璃效果，可將此類別套用在橫幅內部的**子元素**上。
* **`getSafeAreaInsets()`** _（來自 `bleed/utils`）_
  回傳 `{ top, bottom, left, right }` 像素值。支援 SSR 環境（伺服器端回傳全零）。
