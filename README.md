# Note Inspector

把 Obsidian 内置的 **File properties（Frontmatter）**、**Outline**、**Footnotes** 三个视图合并到一个侧边面板里，少在三个视图之间来回切换。

三个分区各自可以折叠，**折叠状态会记住并恢复**（写在插件 `data.json` 里），方便按需只看其中一部分。

名字里的 *inspector* 取「检查器」之意：像开发者工具的检查器那样，选中一篇笔记就给出它的**属性（attributes）、结构（hierarchy）、引用（references）**。图标用 `list-tree`（结构化的列表），与内置三件套的图标（`info` / `list` / `file-signature`）都不重样。

```
┌─ ai-时代的软件工程            ⌄⌃ ⟳ ─┐
│ ⌄ PROPERTIES                    7   │   type / title / description / tags …
│   generated      by  dsh/…          │   （嵌套对象、对象数组折叠成一行）
│   sources      ▸ AI 时代软件工程重塑 │
│   + Add property                    │
│ ⌄ OUTLINE                       5   │   按层级缩进，点击跳转，光标所在标题高亮
│ ⌄ FOOTNOTES                     4   │   定义 + 引用（含上下文），未定义/未引用有标记
└─────────────────────────────────────┘
```

## 功能

**Properties（属性）**
- 按 YAML 原始顺序渲染全部 frontmatter 字段，包括嵌套对象/字典（如 `generated: {by, at}`）与对象数组（如 `sources: [{id, resource, title}]`）。
- **字典**按 `key: value` 逐行展开：点值就地改，悬停行尾「复制 / 删除」；字典底部（**连空字典 `{}` 也是**）有 `＋ Add field`，新字段建好后直接进入编辑态。
- **对象数组**折叠为「一行一条」，点击展开看全部字段（窄侧栏里也能用）；展开后同样有 `＋ Add field`，底部有 **`＋ Add item`**：新记录照抄上一条的字段结构（值清空），自动展开并聚焦第一个字段。标量数组则用 chip 上的 `＋` 追加。
- 新建顶层属性时先选类型：**Text / List / Dict**，分别得到 `""` / `[]` / `{}`。
- 标量值**点击即可就地编辑**（字符串 / 数字），布尔值点击 checkbox 切换；数组里的标量以 chip 呈现，可增删改。
- `＋ Add property` 新建属性，建立后光标自动落到新值上（正在输入的行内编辑器不会被后台刷新冲掉）。
- 值里的 `[[内链]]`、`[文字](链接)`、裸 URL 渲染为可点击链接。
- 点击属性名 → 在笔记中定位到该字段所在行；悬停出现「复制 / 删除」按钮。
- 写入通过 Obsidian 的 `processFrontMatter` 完成，与内置属性编辑器同一条路径。复杂的自定义 YAML 结构（多行字符串块、锚点等）不在面板里编辑，点字段名跳到源码即可。

**Outline（大纲）**
- 取自 Obsidian 的 heading 缓存，按 H1–H6 缩进显示，可设置最大层级。
- 点击标题 → 滚动到对应位置（源码模式移动光标并聚焦，阅读模式滚动预览）。
- 可选：高亮光标当前所在章节的标题。
- 可选：显示 `H1`–`H6` 级别小标签。

**Footnotes（脚注）**
- 按引用顺序编号（与阅读视图一致），每条给出：脚注 id、定义正文（渲染 markdown 链接）、引用次数。
- **单击定义正文 = 直接进入编辑**：就地多行编辑框，`⌘/Ctrl+Enter` 或 ✓ 保存（走编辑器缓冲区，可 `⌘Z` 撤销），`Esc` 或 ✗ 取消；**清空内容即删除该定义**（连同缩进续行一起删干净）。只是点进去看看、没改动的话不会写盘。
- **引用行整体折叠**：每条脚注的「N references」本身就是折叠开关，点它把该条的引用行收起/展开；标题栏右侧的按钮可以一次**折叠/展开全部引用**。悬空或未引用的条目没有这个开关。**折叠状态会记进 `data.json`，重启后照原样恢复**（设置页的 Reset 可一键清空）。
- **要在编辑器里定位**：点脚注**编号或 id** → 选中整条定义（多行定义连缩进续行一起选）；点**某条引用行** → 选中那处 `[^id]`。选中后可直接改写、删除或整段替换。
- 每条引用显示行号 + 该行上下文片段。
- 「被引用但没有定义」标红为 *No matching definition*（点它或悬停出现的 `＋` 可在文末补写定义）；「定义了但没人引用」标记为 *Defined but never referenced*。
- 悬空引用（`[^x]` 没有定义）由面板自己扫描正文得出——Obsidian 的缓存只保留能解析到定义的引用，靠缓存看不到这种情况。
- 定义过长时折叠到 3 行，点「Show more」展开；引用数超过设置值时同样折叠。

**面板本身**
- 顶部显示当前笔记名，右侧两个按钮：全部折叠/全部展开、刷新。
- 分区标题显示条目数量（可关闭）。
- 跟随当前聚焦的笔记；点击面板本身不会让内容消失（会保持上一篇）。
- 命令面板 / 左侧 ribbon 图标：**Open note inspector**。

## 安装

仓库里已经带了构建产物 `main.js`，可以直接复制三个文件到 vault：

```bash
VAULT="/path/to/your/vault"
mkdir -p "$VAULT/.obsidian/plugins/note-inspector"
cp manifest.json main.js styles.css "$VAULT/.obsidian/plugins/note-inspector/"
```

然后在 Obsidian 的 **设置 → 第三方插件** 里启用 **Note Inspector**（需要先关闭受限模式）。

## 开发

```bash
npm install
npm run dev        # esbuild watch（产出带 inline sourcemap 的 main.js）
npm run build      # 类型检查 + 生产构建（压缩，无 sourcemap）
npm run typecheck  # 只做类型检查
npm run deploy     # 把 main.js / manifest.json / styles.css 复制进 vault
```

`npm run deploy` 按以下顺序解析 vault 路径：

1. `npm run deploy -- --vault "/path/to/vault"`
2. 环境变量 `OBSIDIAN_VAULT`
3. 仓库根目录 `config.json` 的 `vault` 字段（本地文件，不入库，模板见 `config.example.json`）
4. 默认值：`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/wiki`

改代码后重载插件：

```bash
obsidian plugin:reload id=note-inspector
obsidian dev:errors
```

## 设置项

| 设置 | 默认 | 说明 |
|---|---|---|
| Panel language | Same as app | 面板文案语言：跟随 Obsidian / English / 简体中文 |
| Show item counts | 开 | 分区标题旁显示条目数量 |
| Outline depth | 6 | 大纲显示到第几级标题（H1–H6） |
| Show heading level badges | 关 | 大纲条目前显示 H1–H6 标签 |
| Highlight current heading | 开 | 高亮光标所在章节的标题（源码模式） |
| Show footnote context | 开 | 显示每条脚注引用所在行的上下文 |
| References shown per footnote | 8 | 超过该数量的引用折叠到「Show more」之后 |
| Reset panel state | — | 恢复默认折叠状态与全部设置 |

三个分区的折叠状态不在设置页里手动配，它们随点击实时记忆并写回 `data.json`。

## 说明与边界

- 三个分区都由 Obsidian 的 **metadata cache** 驱动，所以刷新时机和内置 Outline / Footnotes 一致：笔记内容保存进缓存后（停止输入约 2 秒）面板随之更新，属性编辑走缓存事件即时刷新。脚注定义正文与定义范围取自编辑器缓冲区，因此比缓存更即时、也不会被滞后的缓存位置带偏。
- 面板只在「笔记 / 正文 / 缓存」真的变化时重建 DOM（内容做了哈希标识）。点进面板、切回本笔记这类事件不会重建，因此**正在输入的行内编辑器不会被冲掉**。顶部 ⟳ 与设置变更会强制重建。
- 通过面板改属性会让 Obsidian 重写整个 frontmatter 块（`tags: [a, b]` 可能变成块状列表，行内 flow mapping 会被展开）——这与内置属性编辑器行为一致。
- 脚注面板里的编辑走编辑器缓冲区（可撤销）；如果笔记没有在编辑器中打开，则退回 `vault.process` 原子写回磁盘。
- **折叠状态哪些会记住**：三个分区的折叠、每条脚注的引用行折叠，都写进 `.obsidian/plugins/note-inspector/data.json`，重载插件或重启 Obsidian 后恢复；数组记录的展开、`Show more` 的展开属于临时查看状态，只在本次会话内保留。
- 面板只显示「当前 / 最近聚焦」的笔记；没有活动笔记时给出空状态提示。
- 不修改笔记正文的其它部分，也不改动仓库结构；只做 frontmatter 与脚注行的读写、以及视图渲染。

## 目录结构

```
src/
├── main.ts                 插件入口：注册视图、命令、ribbon、设置页
├── view.ts                 NoteInspectorView：跟随活动笔记、分区装配、定位/选中、按需重建
├── settings.ts             设置页
├── i18n.ts                 中英文案
├── types.ts                设置类型与分区上下文（navigate / editLines）
├── components/
│   └── collapsible.ts      可折叠分区外壳（状态由调用方持久化）
├── sections/
│   ├── properties.ts       属性分区（渲染 / 就地编辑 / 增删数组项 / 定位）
│   ├── outline.ts          大纲分区
│   └── footnotes.ts        脚注分区（定义跨度、悬空引用扫描、就地编辑）
└── util/
    ├── frontmatter.ts      frontmatter 读取、路径定位、嵌套写入
    ├── dom.ts              空状态、图标按钮、单行/多行就地编辑
    ├── links.ts            链接切分（内链 / markdown / URL）
    └── rich-text.ts        富文本与纯文本渲染
styles.css                  面板样式（只用 Obsidian 主题变量）
```

## License

MIT
