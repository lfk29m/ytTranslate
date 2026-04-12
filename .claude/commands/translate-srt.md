將英文 SRT 字幕檔翻譯成繁體中文，輸出至 target/。

## 步驟

### 1. 合併句子

執行以下指令，解析並印出合併後的句子：

```bash
node scripts/merge.js $ARGUMENTS
```

合併後的句子會儲存到 `target/.work/merged.json`。

### 2. 切分 chunk

```bash
node scripts/split_chunks.js 3
```

輸出：`target/.work/chunk_0.json`、`chunk_1.json`、`chunk_2.json`，各約 1/3 句數。

### 3. 並行翻譯

**在同一則訊息中同時呼叫 3 次 Agent 工具**（不可分開呼叫，必須同時送出）。

每個 Agent 的任務說明（chunk 編號請對應替換）：

> 請讀取 `target/.work/chunk_N.json`（純字串陣列，每個元素為一句英文）。
> 將每句翻譯成自然流暢的繁體中文：
>
> - 保持原意，語氣口語化、自然
> - 專有名詞（人名、技術詞彙）可保留英文
>
> 完成後，將所有翻譯**依序**寫入 `target/.work/result_N.json`，格式為純字串陣列：
>
> ```json
> ["第一句翻譯", "第二句翻譯", ...]
> ```
>
> 陣列長度必須與 chunk_N.json 的元素數量完全一致。

等待所有 3 個 Agent 完成。

### 4. 合併翻譯結果

讀取 `result_0.json`、`result_1.json`、`result_2.json`，按順序合併為一個陣列，寫入 `target/.work/translations.json`。

合併前先驗證：

```bash
node -e "
const fs = require('fs');
const m = JSON.parse(fs.readFileSync('target/.work/merged.json','utf-8'));
const t = [
  ...JSON.parse(fs.readFileSync('target/.work/result_0.json','utf-8')),
  ...JSON.parse(fs.readFileSync('target/.work/result_1.json','utf-8')),
  ...JSON.parse(fs.readFileSync('target/.work/result_2.json','utf-8')),
];
console.log('翻譯數量:', t.length, '/ 原文數量:', m.length, '/', t.length === m.length ? '✓ 一致' : '✗ 不一致');
"
```

一致後，使用 Write 工具將合併陣列寫入 `target/.work/translations.json`。

### 5. 套用翻譯並輸出

```bash
node scripts/apply_translations.js $ARGUMENTS target/.work/translations.json
```

輸出檔案會自動儲存至 `target/<filename>_zh.srt`。

## 故障排除

### ❌ 寫入 JSON 時指令卡死

**解法**：直接使用 Write 工具寫入檔案，**不要用** Bash 指令來寫大型 JSON。

---

### ❌ result_N.json 數量與 chunk_N.json 不一致

重新啟動對應的 Agent 翻譯該 chunk，直到數量一致。

---

### ❌ 輸出的 SRT 時間軸對不上

這通常發生在原始 SRT 有**重疊時間戳**（overlapping timestamps）時，這是 YouTube 自動字幕的常見現象，屬預期行為。
