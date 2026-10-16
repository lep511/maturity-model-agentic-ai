# 🔗 Link Checker — AWS Maturity Model

Scans `.json` / `.jsonl` files inside the `data/` directory, validates their size, extracts all URLs that start with `https://maturitymodel.security.aws.dev`, and verifies whether each link is reachable.

---

## ⚙️ Requirements

| Tool   | Purpose                       |
|--------|-------------------------------|
| `bash` | Script runtime (>= 4.0)       |
| `grep` | URL pattern matching          |
| `sed`  | Text extraction and escaping  |
| `curl` | HTTP requests (check_link)    |

Verify they are available:

```bash
bash --version
grep --version
sed --version
curl --version
```

---

## 🚀 Usage

### Step 1 — Give execution permissions

```bash
chmod +x data/count_chars.sh
chmod +x data/extract_link.sh
chmod +x data/check_link.sh
```

---

### Step 2 — Validate file sizes

Scans all `.json` and `.jsonl` files and checks whether any exceed **1300 characters**. Files that exceed the threshold are saved to an output JSON and the script exits with an error.

```bash
./data/count_chars.sh data/
```

| Argument        | Default            | Description                            |
|-----------------|--------------------|----------------------------------------|
| `<directory>`   | `.` (current dir)  | Directory containing JSON files        |
| `[output.json]` | `large_files.json` | File where oversized results are saved |
| `--threshold N` | `1300`             | Maximum number of characters allowed   |

**Console output example:**
```
🔍 Scanning JSON files in: data/
📏 Threshold: 1300 characters
  ✅ data/phase_1/small_file.json → 843 chars (OK)
  ⚠️  data/phase_3/advanced_ddos.json → 4521 chars (exceeds 1300)

❌ 1 file(s) exceeded the 1300 character threshold.
```

**Output example — `large_files.json`:**
```json
[
  { "file_name": "data/phase_3/advanced_ddos.json", "count": 4521 }
]
```

---

### Step 3 — Extract links from the `data/` directory

Scans all `.json` and `.jsonl` files recursively and outputs only URLs starting with `https://maturitymodel.security.aws.dev`.

```bash
./data/extract_link.sh
```

| Argument        | Default             | Description                          |
|-----------------|---------------------|--------------------------------------|
| `<directory>`   | `.` (current dir)   | Directory containing JSON files      |
| `[output.json]` | `links_output.json` | File where extracted links are saved |

**Output example — `links_output.json`:**
```json
[
  { "file_name": "data/phase_1/file1.json", "link": "https://maturitymodel.security.aws.dev/en/1.-quickwins/mfa/" },
  { "file_name": "data/phase_2/file2.json", "link": "https://maturitymodel.security.aws.dev/en/2.-foundational/backups/" }
]
```

---

### Step 4 — Verify each link

Reads the `links_output.json` file and sends an HTTP request to each URL, reporting the status code and response time. Exits with an error if any **4xx/5xx** responses are found.

```bash
./data/check_link.sh
```

| Argument / Option | Default              | Description                        |
|-------------------|----------------------|------------------------------------|
| `<input.json>`    | `links_output.json`  | JSON produced by `extract_link.sh` |
| `[output.json]`   | `links_checked.json` | File where results are saved       |
| `--timeout N`     | `10`                 | Seconds before a request times out |
| `--retries N`     | `2`                  | Retry attempts on network failure  |
| `--parallel N`    | `5`                  | Number of simultaneous requests    |

**Console output example:**
```
✅ [200] ok — https://maturitymodel.security.aws.dev/en/1.-quickwins/mfa/  (219ms)
❌ [404] client_error — https://maturitymodel.security.aws.dev/en/3.-efficient/broken-link/  (128ms)
   ↳ data/phase_3/advanced_ddos_mitigation_l7.json
```

**Output example — `links_checked.json`:**
```json
[
  {
    "file_name": "data/phase_1/file1.json",
    "link": "https://maturitymodel.security.aws.dev/en/1.-quickwins/mfa/",
    "http_code": 200,
    "status": "ok",
    "final_url": "https://maturitymodel.security.aws.dev/en/1.-quickwins/mfa/",
    "response_time_ms": 219,
    "error": ""
  }
]
```

---

## 📊 Status Reference

| Status         | HTTP Code | Icon | Fails workflow |
|----------------|-----------|------|----------------|
| `ok`           | 2xx       | ✅   | No             |
| `redirect`     | 3xx       | ↩️   | No             |
| `client_error` | 4xx       | ❌   | **Yes**        |
| `server_error` | 5xx       | 🔥   | **Yes**        |
| `unreachable`  | —         | 🚫   | No             |

---

## 🤖 GitHub Actions

The workflow runs automatically on every `push` or `pull_request` that modifies any file inside `data/`. Steps run in order and stop immediately if any one of them fails.

```
count_chars.sh → extract_link.sh → check_link.sh
```

| Step             | Fails workflow if...                        |
|------------------|---------------------------------------------|
| `count_chars.sh` | Any file exceeds 1300 characters            |
| `extract_link.sh`| Script exits with an error                  |
| `check_link.sh`  | Any link returns a 4xx or 5xx HTTP response |

The `links_checked.json` artifact is always uploaded at the end, even if the workflow fails, so results can be inspected directly from the GitHub Actions UI under **Actions → your run → Artifacts**.
