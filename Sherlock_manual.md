# 🕵️ Sherlock Manual

A step-by-step guide to installing and using the Sherlock chain analysis engine on your local machine.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Cloning the Repository](#cloning-the-repository)
3. [Installation](#installation)
4. [Running the CLI Analyzer](#running-the-cli-analyzer)
5. [Viewing the Reports](#viewing-the-reports)
6. [Launching the Web Visualizer](#launching-the-web-visualizer)
7. [Using the Web UI](#using-the-web-ui)
8. [Importing New Block Files](#importing-new-block-files)
9. [Running the Tests](#running-the-tests)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

| Requirement | Minimum Version | Check Command |
|---|---|---|
| **Node.js** | v18+ | `node --version` |
| **npm** | v9+ | `npm --version` |
| **Bash** | v4+ | `bash --version` |
| **gunzip** | any | `gunzip --version` |

> [!NOTE]
> Sherlock is a pure Node.js project with no native compilation step. It runs on Linux, macOS, and WSL on Windows.

---

## Cloning the Repository

```bash
git clone https://github.com/SummerOfBitcoin/2026-developer-challenge-3-sherlock-0xunLin.git
cd 2026-developer-challenge-3-sherlock-0xunLin
```

---

## Installation

Run the setup script **once** to install all dependencies and decompress the block fixture files:

```bash
# 1. Install Node.js dependencies
npm install

# 2. Decompress fixtures and finalize setup
./setup.sh
```

**What `setup.sh` does:**
- Decompresses all `fixtures/*.dat.gz` files into their corresponding `.dat` files (if not already present).
- The fixture files include real Bitcoin block data (`blk04330.dat`, `blk05051.dat`) along with their undo files (`rev*.dat`) and the XOR key (`xor.dat`).

After this step, your `fixtures/` directory should contain:

```
fixtures/
├── blk04330.dat        # ~133 MB block data
├── blk04330.dat.gz
├── blk05051.dat        # ~133 MB block data
├── blk05051.dat.gz
├── rev04330.dat         # undo/prevout data
├── rev04330.dat.gz
├── rev05051.dat
├── rev05051.dat.gz
└── xor.dat              # 8-byte XOR decryption key
```

---

## Running the CLI Analyzer

The CLI reads raw block files, applies 9 chain-analysis heuristics, and produces both JSON and Markdown outputs.

### Basic Usage

```bash
./cli.sh --block <blk.dat> <rev.dat> <xor.dat>
```

### Analyzing the Provided Fixtures

```bash
# Analyze block file blk04330
./cli.sh --block fixtures/blk04330.dat fixtures/rev04330.dat fixtures/xor.dat

# Analyze block file blk05051
./cli.sh --block fixtures/blk05051.dat fixtures/rev05051.dat fixtures/xor.dat
```

### What It Produces

For each block file, two output files are written to `out/`:

| Output File | Description |
|---|---|
| `out/blk04330.json` | Machine-readable JSON with per-transaction heuristic results |
| `out/blk04330.md` | Human-readable Markdown report with summaries and statistics |

### Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Error (details printed as structured JSON to stderr) |

> [!TIP]
> The JSON output for large blocks can exceed 200 MB. Sherlock streams the output to avoid memory issues.

---

## Viewing the Reports

After running the CLI, open the generated Markdown reports directly on GitHub or locally:

```bash
# View the Markdown report in your terminal (requires a Markdown viewer)
cat out/blk04330.md

# Or open in your browser (if using VS Code)
code out/blk04330.md
```

The reports include:
- File overview (source filename, block count, total transactions)
- Summary statistics (fee rates, script type distribution, flagged transaction counts)
- Per-block sections with heuristic findings and notable transactions

---

## Launching the Web Visualizer

Start the interactive web dashboard:

```bash
./web.sh
```

This will print a URL to stdout (default: `http://127.0.0.1:3000`) and keep the server running.

**Open your browser** and navigate to the printed URL.

### Custom Port

To run on a different port:

```bash
PORT=8080 ./web.sh
```

### Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

### Health Check

Verify the server is running:

```bash
curl http://127.0.0.1:3000/api/health
# Expected: {"ok":true}
```

---

## Using the Web UI

The Sherlock web visualizer is a scrollytelling interface with three main sections:

### 1. Hero Section

The landing page features an interactive **Heuristics Dictionary** — a carousel of cards explaining each chain-analysis concept (CIOH, change detection, CoinJoin, etc.). Click the **`>`** arrow button to cycle through definitions.

### 2. Heuristics Showcase

Scroll down to see three phone mockup cards illustrating the three core heuristics:
- **CIOH** — Common Input Ownership
- **Change Detection** — identifying change outputs
- **CoinJoin** — collaborative privacy transactions

### 3. Dashboard

This is the main analysis interface. Here's how to use it:

1. **Select a block file** from the dropdown in the header bar (e.g., `blk04330.dat`).
2. **View block-level statistics**: total transactions, flagged count, average fee rate, and number of heuristics applied.
3. **Navigate between blocks** using the tab bar. If there are more than 10 blocks, click "More Blocks ▾" to see all.
4. **Filter transactions** using the "Filter Txs" dropdown:
   - *By Classification*: Simple Payment, Consolidation, CoinJoin, Self Transfer, Batch Payment
   - *By Heuristic*: CIOH, Change Detection, Address Reuse, Round Number Payment, OP_RETURN, Peeling Chain, and more
5. **Click any TXID** in the transaction table to open a detailed modal showing:
   - Full TXID (linked to mempool.space)
   - Classification badge
   - Transaction graph (inputs → outputs with script types and BTC values)
   - Byte breakdown bar
   - All heuristics that fired, with raw JSON details

### Sidebar Tools

On the left sidebar, you'll find three utility buttons:

| Button | Name | Description |
|---|---|---|
| 🕵️ | Dashboard | Jump to the dashboard section |
| **ig** | Information Glossary | Searchable glossary of 40+ Bitcoin and chain-analysis terms |
| **tt** | Transaction Tracer | Paste a 64-character TXID to instantly locate a transaction in the loaded data |
| **in** | Import New Block | Upload new `blk`, `rev`, and `xor` files to analyze on-the-fly |

### Theme Toggle

Click the **MODERN MODE / VICTORIAN MODE** button at the top center to switch between:
- **Victorian Mode** (default) — dark sepia detective aesthetic with serif typography
- **Modern Mode** — clean, light, data-dense layout

---

## Importing New Block Files

You can analyze new block files directly from the web UI without using the command line:

1. Click the **`in`** button on the left sidebar.
2. Select the three required `.dat` files:
   - **BLK FILE** — the `blk*.dat` block data
   - **REV FILE** — the `rev*.dat` undo data
   - **XOR FILE** — the `xor.dat` decryption key
3. Click **ANALYZE FILES**.
4. The server will run the CLI engine, generate the JSON and Markdown outputs, and automatically load the results in the dashboard.

> [!IMPORTANT]
> All three files must be provided. The XOR key (`xor.dat`) is shared across all block files in the same data directory.

---

## Running the Tests

Sherlock includes unit tests for the analyzer, CLI, and server:

```bash
# Run all tests
npm test

# Run tests with coverage
npx jest --coverage
```

### Grading Script

To run the automated grading checks:

```bash
./grade.sh
```

This validates JSON schema compliance, heuristic coverage, report reproducibility, and web server health.

---

## Troubleshooting

### `./cli.sh: Permission denied`

```bash
chmod +x cli.sh web.sh setup.sh
```

### `gunzip: command not found`

Install gzip:
```bash
# Debian/Ubuntu
sudo apt-get install gzip

# macOS (usually pre-installed)
brew install gzip
```

### `Cannot find module 'express'`

You forgot to install dependencies:
```bash
npm install
```

### JSON output is very large / slow

This is expected for blocks with 3000+ transactions. The CLI streams output to manage memory. The JSON file for `blk04330` is ~300 MB. Ensure you have sufficient disk space.

### Web UI shows "No analyzed files found"

Run the CLI first to generate the `out/*.json` files, then refresh the web page:
```bash
./cli.sh --block fixtures/blk04330.dat fixtures/rev04330.dat fixtures/xor.dat
```

### Port already in use

```bash
PORT=3001 ./web.sh
```

---

## Project Structure

```
.
├── cli.sh              # CLI entry point (bash wrapper)
├── cli.js              # CLI logic (Node.js)
├── parser.js           # Raw block file parser
├── analyzer.js         # 9 chain-analysis heuristics
├── server.js           # Express web server + API
├── setup.sh            # Dependency installer
├── web.sh              # Web server launcher
├── grade.sh            # Automated grading script
├── APPROACH.md         # Heuristic documentation
├── MANUAL.md           # This file
├── demo.md             # Demo video link
├── fixtures/           # Compressed block data fixtures
├── out/                # Generated JSON + Markdown reports
├── public/             # Web visualizer (HTML/CSS/JS)
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   ├── manual.html
│   └── fonts/
└── tests/              # Jest unit tests
```

---

*Built with ☕ and Node.js. No external APIs, no build step, no frameworks — just pure JavaScript.*
