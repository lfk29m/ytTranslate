將英文 SRT 字幕檔翻譯成繁體中文，並自動同步至雲端。

## 執行步驟

### 1. 預處理 (Preprocess)
此步驟會**自動清空**舊的中間檔案，並將字幕合併切分：
```bash
node scripts/preprocess.js $ARGUMENTS [chunkCount]
```
- 預設切分為 3 個 chunk。
- 檔案存放於 `target/.work/`。

### 2. 高效並行翻譯 (Parallel Translation)
啟動多個子代理，並行翻譯 `target/.work/chunk_N.json`：
- **風格指引**：繁體中文、口語化、保留專業術語英文。
- **限制**：輸出陣列長度必須與輸入完全一致。
- **輸出**：將結果寫入 `target/.work/result_N.json`，格式為 `["翻譯1", "翻譯2", ...]`。

### 3. 完成與驗證 (Finalize)
自動收集所有翻譯結果並產出最終 SRT：
```bash
node scripts/finalize.js $ARGUMENTS
```
- 自動偵測並合併所有 `result_*.json`。
- **除錯支援**：中間檔案會保留在 `target/.work/` 供事後檢查。

### 4. 上傳至 Google 雲端硬碟 (選用)
```bash
node scripts/upload_to_gdrive.js target/<filename>_zh.srt 1QauwbMba5Ta7MfrvIREAGoWGyCXXOeHf
```

## 故障排除

### ❌ 數量不一致 (Mismatch)
`finalize.js` 會報錯並顯示預期與實際數量。請檢查 `target/.work/result_N.json` 哪一塊數量出錯，並針對該 chunk 重新執行翻譯。

### ❌ 認證過期 (Login Required)
腳本會嘗試自動刷新 Token。若失敗，請確保 `.gdrive-creds/token.json` 包含 `refresh_token`。
