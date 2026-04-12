---
name: translate-srt
description: "將英文 SRT 字幕檔翻譯成繁體中文，並支援自動化上傳至指定 Google 雲端硬碟資料夾。"
argument-hint: "SRT 檔案路徑，例如 source/input.srt"
---

# 英文 SRT 字幕翻譯與雲端同步工作流

此技能整合了「環境清理」、「翻譯優化」與「雲端備份」，透過專案內建腳本確保翻譯品質與流程的可追溯性。

## 使用時機
- 使用者想把英文 `.srt` 檔翻譯成繁體中文。
- 希望翻譯後的字幕能精確對應原始時間戳並自動同步雲端。

## 執行步驟

### 1. 預處理 (Preprocess)
此步驟會**自動清空**舊的中間檔案，並將字幕合併切分：
```bash
node scripts/preprocess.js <input.srt> [chunkCount]
```
- 預設切分為 3 個 chunk。
- 檔案存放於 `target/.work/`。

### 2. 高效並行翻譯 (Parallel Translation)
啟動多個 `generalist` 子代理，並行翻譯 `target/.work/chunk_N.json`：
- **風格指引**：繁體中文、口語化、保留專業術語英文。
- **限制**：輸出陣列長度必須與輸入完全一致。
- **輸出**：將結果寫入 `target/.work/result_N.json`。

### 3. 完成與驗證 (Finalize)
自動收集所有翻譯結果並產出最終 SRT：
```bash
node scripts/finalize.js <input.srt>
```
- 自動偵測並合併所有 `result_*.json`。
- **除錯支援**：中間檔案會保留在 `target/.work/` 供事後檢查。

### 4. 上傳至 Google 雲端硬碟 (選用)
當翻譯完成且檔案產生後，執行上傳：
```bash
node scripts/upload_to_gdrive.js target/<filename>_zh.srt 1QauwbMba5Ta7MfrvIREAGoWGyCXXOeHf
```
*註：腳本會自動處理 Token 刷新，確保上傳流程不中斷。*

## 故障排除
- **數量不一致**：`finalize.js` 會報錯。請檢查 `target/.work/result_N.json` 哪一塊數量出錯，並針對該 chunk 重新執行翻譯。
- **寫入失敗**：寫入大型 JSON 時，優先使用 `write_file` 工具而非 shell 重導向，以避免內容截斷或 buffer 溢出。
- **認證過期**：若發生 `Login Required`，腳本會嘗試自動刷新；若仍失敗，請檢查 `.gdrive-creds/token.json` 是否包含 `refresh_token`。
