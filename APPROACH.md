# Approach

This document describes the chain-analysis heuristics implemented by the Sherlock engine, the architecture and data-flow, key design trade-offs, and references.

---

## Heuristics Implemented

### 1. Common Input Ownership Heuristic (CIOH)

**What it detects:**
The CIOH is the foundational assumption of chain analysis. It states that if multiple inputs are consumed in a single transaction, those inputs are very likely controlled by the same wallet (entity). This is because creating a valid transaction requires signing each input with the corresponding private key — in practice, only the wallet owner possesses all of them.

**How it is detected/computed:**
A transaction is flagged when `tx.vins.length > 1` and the transaction is not a coinbase. We additionally report the `input_count` and assign a confidence level based on how many inputs are present:
- 2 inputs → `medium` confidence (could be a 2-party spend)
- 3–9 inputs → `high` confidence
- 10+ inputs → `very_high` confidence

**Confidence model:**
The more inputs spent together, the less likely it is that multiple independent parties coordinated them off-chain (the exception being CoinJoin). When a transaction is also flagged as CoinJoin, the CIOH confidence is effectively overridden — CoinJoins deliberately break this assumption.

**Limitations:**
- **False positives with CoinJoin/PayJoin:** multi-party protocols deliberately combine inputs from different owners to break this heuristic.
- **False positives with batched services:** exchanges and payment processors may batch withdrawals from a hot wallet, which still satisfies CIOH but may conflate entity boundaries.

---

### 2. Change Detection

**What it detects:**
In a standard payment, one output goes to the recipient and one returns change to the sender. Identifying the change output lets an analyst link the sender's current UTXO (change) back to the same entity, extending the transaction graph.

**How it is detected/computed:**
Two methods are applied in priority order:

1. **Script-type matching (`script_type_match`, confidence `high`):** If all inputs share one script type (e.g. `p2wpkh`) and exactly one output matches that type while the other(s) differ, the matching output is labelled as change. Wallets almost always send change back to the same address type.

2. **Round-number exclusion (`round_number_exclusion`, confidence `medium`):** For 2-output transactions where exactly one output has a "round" value (divisible by 10 000 sats ≈ 0.0001 BTC), the non-round output is likely change. Humans tend to send round amounts; wallets return whatever dust remains.

3. **Larger-output fallback (`larger_output`, confidence `low`):** If a 2-output transaction hasn't been matched by the above methods, and the output values are unequal, we assume the larger output is the change. This relies on the real-world behaviour where people usually spend less than their whole UTXO balance.

**Confidence model:**
- `high` when script-type matching uniquely identifies one output.
- `medium` when round-number analysis is used.
- `low` for the larger-output fallback, as this makes a broad assumption.

**Limitations:**
- **Same-type outputs:** When both outputs share the input script type, this heuristic cannot distinguish change from payment by script type alone.
- **Privacy-aware wallets:** Some wallets deliberately create outputs of the same type or add decoy round amounts.
- **Batched payments:** Transactions with more than 2 outputs are not analysed by the round-number method.

---

### 3. Consolidation Detection

**What it detects:**
Consolidation transactions combine many UTXOs into one or two outputs, typically performed by wallets or services for UTXO set management. These are strong signals of single-entity control.

**How it is detected/computed:**
A transaction is classified as a consolidation when:
- `vins.length >= 3` (many inputs)
- `vouts.length <= 2` (1–2 outputs)
- Not a coinbase transaction

Confidence is assigned based on the input-to-output ratio:
- Ratio ≥ 10:1 → `very_high`
- Ratio ≥ 5:1 → `high`
- Otherwise → `medium`

**Confidence model:**
High input-to-output ratios are almost exclusively consolidation; lower ratios could occasionally be payments that happen to spend multiple UTXOs.

**Limitations:**
- **Multi-output consolidations:** Some consolidations split into 3+ outputs for fee management, which our threshold misses.
- **Overlap with simple payments:** A 3-input, 2-output transaction could be a simple payment that happened to require 3 inputs to cover the amount.

---

### 4. Address Reuse Detection

**What it detects:**
Address reuse occurs when the same scriptPubKey appears in both the inputs and outputs of a transaction (or across transactions in the same block). Reusing an address weakens privacy by linking multiple UTXOs and transactions to the same public key.

**How it is detected/computed:**
For each non-coinbase transaction:
1. Collect the set of input scriptPubKey hashes (from the prevout data).
2. Check each output scriptPubKey against this set.
3. If any match is found, the transaction is flagged.

We additionally report the count of reused scriptPubKeys.

**Confidence model:**
Address reuse is a deterministic observation — if the same scriptPubKey appears in both inputs and outputs, the detection is `certain`. However, the *implication* (same entity controls all) is probabilistic.

**Limitations:**
- **Cross-transaction reuse:** We only check within a single transaction, not across the entire block or blockchain. Cross-block reuse would require a full UTXO index.
- **P2SH scripts:** Two identical P2SH scripts may represent different redeem scripts (though this is extremely rare in practice).

---

### 5. Round Number Payment Detection

**What it detects:**
Outputs with values that are round BTC amounts (e.g. 0.01 BTC = 1 000 000 sats, 0.1 BTC = 10 000 000 sats) are more likely to be deliberate payments. Non-round outputs are more likely to be change.

**How it is detected/computed:**
For each non-coinbase transaction, we check whether any output value is divisible by 100 000 sats (0.001 BTC). If so, the transaction is flagged and we record the indices of all round-valued outputs.

**Confidence model:**
- `high` when a round output is found alongside a clearly non-round output (strong signal of payment vs. change).
- `medium` when multiple outputs are round (ambiguous — could be batched payments or coincidence).

**Limitations:**
- **Arbitrary threshold:** The 0.001 BTC threshold is a convention; some users send non-round amounts, and some change values happen to be round.
- **Denominated CoinJoin outputs:** CoinJoin protocols often produce equal round-valued outputs, which can trigger this heuristic despite not being payments.

---

### 6. CoinJoin Detection

**What it detects:**
CoinJoin is a privacy technique where multiple users combine their inputs and create equal-value outputs to obscure the link between inputs and outputs. Detecting CoinJoins helps an analyst identify privacy-seeking behaviour and avoid false CIOH conclusions.

**How it is detected/computed:**
A transaction is flagged as CoinJoin when:
- `vins.length >= 3` and `vouts.length >= 3` (multiple participants)
- At least 3 outputs share the exact same value (the "denomination")

We report the count of matching outputs (`matching_outputs`) and assign `high` confidence when the criterion is met.

**Confidence model:**
- `high` confidence when ≥ 3 outputs share an identical value. The probability of this happening by coincidence in a non-CoinJoin transaction is very low.
- The threshold of 3 matching outputs balances detection accuracy against false positives.

**Limitations:**
- **PayJoin / P2EP:** Two-party CoinJoins (PayJoin) typically have only 2 participants and may not meet the 3-output threshold.
- **Equal-value batches:** Exchange withdrawal batches occasionally produce equal outputs, which could be mistaken for CoinJoin.
- **Wasabi/Whirlpool variants:** Some CoinJoin implementations add coordinator fees or unmixed change that complicates detection.

---

### 7. OP_RETURN Analysis

**What it detects:**
OP_RETURN outputs are provably unspendable and are used to embed arbitrary data on-chain. Common protocols include Omni Layer, OpenTimestamps, and various anchoring/notarization services. Tracking OP_RETURN usage reveals non-payment activity in a block.

**How it is detected/computed:**
For each non-coinbase transaction, we scan outputs for `scriptType === 'op_return'`. When found, we record the indices of all OP_RETURN outputs. Confidence is `certain` since OP_RETURN is deterministically identified from the script.

**Confidence model:**
Detection is deterministic — the presence of an OP_RETURN script is unambiguous. The confidence is always `certain`.

**Limitations:**
- **Protocol identification:** We detect the presence of OP_RETURN but do not yet classify the embedded data by protocol (e.g. distinguishing Omni from OpenTimestamps). This would require parsing the OP_RETURN payload.
- **Non-standard OP_RETURN sizes:** Some miners accept OP_RETURN outputs larger than 80 bytes, which may carry different semantics.

---

### 8. Self-Transfer Detection

**What it detects:**
Self-transfers are transactions where all inputs and outputs appear to belong to the same entity. These are common wallet operations — moving funds between own addresses for privacy rotation, key management, or consolidation with type changes.

**How it is detected/computed:**
A transaction is flagged as a self-transfer when:
1. Not a coinbase transaction.
2. All inputs share the same script type.
3. All outputs also match that same script type.
4. No output has a round value (no obvious payment component).
5. The transaction has at least 2 outputs (to distinguish from consolidation).

As a secondary signal, the simpler case of 1-input, 1-output with address reuse also triggers (direct self-send).

**Confidence model:**
- `high` confidence when all inputs and outputs share a script type and no round payment is detected.
- `medium` confidence for the simpler 1-in, 1-out address reuse case.

**Limitations:**
- **Same-type payments:** If a user sends funds to someone using the same address type, this heuristic would incorrectly flag it as self-transfer.
- **Privacy-preserving wallets:** Wallets that always generate the same address type would make self-transfers indistinguishable from payments in script type alone.

---

### 9. Peeling Chain Step Detection

**What it detects:**
Peeling chains occur when an entity makes a series of payments by repeatedly taking a large UTXO, sending a small amount to a destination, and sending the potentially large change to a new address they control. Identifying a peeling step helps analysts follow a single actor's funds across multiple transactions. It's a structure commonly seen in mixing services or automated exchange withdrawals.

**How it is detected/computed:**
Since we cannot confidently link inter-block chains synchronously in a single pass without indexing, we identify *individual steps* that fit the peeling chain criteria:
1. Not a coinbase transaction.
2. `vins.length === 1` and `vouts.length === 2`.
3. One output is significantly larger than the other (specifically, the maximum output value is ≥ 5x the minimum output value).

We report the larger output as the likely change index.

**Confidence model:**
- `high` if the larger output's script type matches the single input's script type.
- `medium` otherwise, as the 5:1 ratio threshold is heuristic and may flag standard unbalanced payments.

**Limitations:**
- **Local Scope:** We only flag the transaction *shape* as a potential peel step; we do not recursively trace the change address through subsequent blocks.
- **Normal user payments:** An ordinary payment from a wealthy wallet to a low-value service naturally creates this 1-in-2-out unbalanced shape.

---

## Architecture Overview

```
blk*.dat + rev*.dat + xor.dat
         │
         ▼
  ┌─────────────┐
  │  parser.js   │  ← Reads raw block files, XOR-decodes,
  │              │     extracts blocks, txs, prevout data
  └──────┬──────┘
         │ blocks[]
         ▼
  ┌─────────────┐
  │ analyzer.js  │  ← Applies 9 heuristics per tx,
  │              │     classifies tx, computes stats
  └──────┬──────┘
         │ result { fileStats, blocks[] }
         ▼
  ┌─────────────┐
  │   cli.js     │  ← Entry point: writes out/<stem>.json
  │              │     and out/<stem>.md reports
  └─────────────┘

  ┌─────────────┐
  │  server.js   │  ← Express server: serves /api/health,
  │              │     /api/files, /api/analyze, static files
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ public/      │  ← Web visualizer: index.html + app.js
  │  app.js      │     + style.css (interactive dashboard)
  └─────────────┘
```

**Language & Framework:** Pure Node.js (no transpilation, no build step). Express for the web server. Vanilla HTML/CSS/JS for the frontend — no frameworks, no external runtime dependencies.

**Data flow:**
1. `parser.js` reads raw binary `.dat` files, applies XOR decoding, and extracts block headers, transactions, inputs (with prevout data from the undo file), and outputs.
2. `analyzer.js` iterates every transaction, applies all 9 heuristics, classifies the transaction, and aggregates per-block and file-level statistics.
3. `cli.js` streams the JSON output to avoid memory issues on large block files and generates the Markdown report.
4. `server.js` serves the web visualizer and provides an API endpoint (`/api/upload`) that executes the CLI engine via child process, captures precise `stderr` traces for file validation, and returns structured data to the client.
5. The frontend (`app.js`) dynamically renders interactive dashboards, complete with heuristic dictionaries, a searchable Information Glossary, and detailed block byte breakdowns.

---

## Trade-offs and Design Decisions

### Accuracy vs. Performance
- **Streaming JSON output:** The JSON output for large blocks (3000+ txs) can exceed 200 MB. We use `fs.createWriteStream` and write transaction-by-transaction to avoid V8's string length limits and reduce peak memory.
- **Heuristic simplicity:** Each heuristic runs in O(n) per transaction (where n = inputs + outputs). No cross-transaction analysis (e.g. building a full UTXO graph) is performed — this keeps analysis fast but limits detection of peeling chains or cross-block address reuse.

### Simplicity vs. Coverage
- We implemented 8 heuristics covering the core chain-analysis techniques. We chose heuristics that can be evaluated per-transaction without requiring a global transaction index, keeping the engine self-contained.
- CoinJoin detection uses a simple equal-output-count threshold rather than a full subgraph matching algorithm (e.g. Boltzmann analysis), trading precision for simplicity.

### Confidence Model
- Each heuristic assigns one of four confidence levels: `certain`, `very_high`, `high`, `medium`. This is a qualitative scale rather than a numeric probability — acceptable for a demonstration engine, though a production system would benefit from Bayesian scoring.

### Script-Type Based Analysis
- We rely heavily on script types (p2pkh, p2wpkh, p2tr, etc.) extracted from the raw scriptPubKey. This avoids the need for a full address derivation library while still enabling powerful heuristics like change detection and consolidation analysis.

### UI/UX and Thematic Design
- **Dual-Theme System:** The visualizer incorporates a toggleable styling system ("Modern" vs. "Victorian" modes). The Victorian theme utilizes bespoke serif typography and high-contrast color palettes to evoke a classic detective aesthetic, while the Modern theme focuses on clean, data-dense layouts.
- **Interactive Education:** Rather than just displaying raw data, the frontend includes a "Heuristics Dictionary" carousel and an "Information Glossary". This educates users on complex chain-analysis concepts directly within the app, lowering the barrier to entry.
- **Robust Feedback:** The file upload mechanism pipes raw JSON error outputs from the trailing CLI process directly into the frontend UI, providing users with exact failure reasons (e.g., "Mismatched block heights") instead of generic errors.

---

## References

- **BIP 34** — Block v2, Height in Coinbase: https://github.com/bitcoin/bips/blob/master/bip-0034.mediawiki
- **BIP 141** — Segregated Witness: https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
- **Meiklejohn et al. (2013)** — "A Fistful of Bitcoins: Characterizing Payments Among Men with No Names" — foundational paper on CIOH and transaction graph analysis.
- **Ermilov, Panov, Yanovich (2017)** — "Automatic Bitcoin Address Clustering" — methods for clustering addresses using heuristics.
- **Möser & Narayanan (2017)** — "Obfuscation in Bitcoin: Techniques and Politics" — CoinJoin and mixing analysis.
- **Bitcoin Wiki — Privacy:** https://en.bitcoin.it/wiki/Privacy — comprehensive overview of privacy techniques and common heuristics.
- **OXT Research** — https://oxt.me — practical chain analysis patterns and cluster analysis.
- **Chainalysis blog** — https://blog.chainalysis.com — industry-standard chain analysis techniques.
