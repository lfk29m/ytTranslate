將英文 SRT 字幕檔翻譯成繁體中文，輸出至 target/。

## 步驟

### 1. 合併句子

執行以下指令，解析並印出合併後的句子：

```bash
node scripts/merge.js $ARGUMENTS
```

合併後的句子會儲存到 `target/.work/merged.json`。

### 2. 翻譯

讀取 `target/.work/merged.json`，將每個物件的 `text` 欄位翻譯成自然流暢的繁體中文。注意：

- 保持原意，字幕語氣要口語化、自然
- 專有名詞（人名、技術詞彙）可保留英文
- 每次最多處理 50 句，分批翻譯

### 3. 儲存翻譯結果

將翻譯結果寫入 `target/.work/translations.json`，格式為字串陣列：

```json
["第一句翻譯", "第二句翻譯"]
```

陣列長度**必須**與 `merged.json` 中的物件數量完全一致。

### 4. 套用翻譯並輸出

```bash
node scripts/apply_translations.js $ARGUMENTS target/.work/translations.json
```

輸出檔案會自動儲存至 `target/<filename>_zh.srt`。

## 故障排除

### ❌ 寫入 translations.json 時指令卡死

**原因**：使用 shell heredoc（`cat << 'EOF'`）寫入大量內容時，shell 的 pipe buffer 會滿，造成指令卡死等待輸出被讀取，形成死鎖。

**解法**：直接使用 Write 工具寫入檔案，**不要用** Bash 指令來寫大型 JSON。

---

### ❌ 翻譯數量與原文數量不一致

套用翻譯前，先用以下指令驗證：

```bash
node -e "
const t = JSON.parse(require('fs').readFileSync('target/.work/translations.json','utf-8'));
const m = JSON.parse(require('fs').readFileSync('target/.work/merged.json','utf-8'));
console.log('翻譯數量:', t.length, '/ 原文數量:', m.length, '/', t.length === m.length ? '✓ 一致' : '✗ 不一致');
"
```

若數量不一致，`apply_translations.js` 會對不上的句子保留原文。

---

### ❌ 輸出的 SRT 時間軸對不上

這通常發生在原始 SRT 有**重疊時間戳**（overlapping timestamps）時，這是 YouTube 自動字幕的常見現象。`apply_translations.js` 會依英文字元比例分配時間，重疊的來源 block 可能導致時間計算偏差，這是預期行為。
