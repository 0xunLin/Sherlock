function analyzeBlocks(blocks) {
    const fileStats = {
        total_transactions_analyzed: 0,
        flagged_transactions: 0,
        script_type_distribution: {},
        fee_rates: [],
        size_stats: { total_size: 0, base_size: 0, weight: 0, vbytes: 0 }
    };

    const blockResults = [];

    for (const block of blocks) {
        const blockSummary = {
            total_transactions_analyzed: block.txCount,
            heuristics_applied: ["cioh", "change_detection", "consolidation", "address_reuse", "round_number_payment", "coinjoin", "op_return", "self_transfer"],
            flagged_transactions: 0,
            script_type_distribution: {},
            fee_rates: [],
            size_stats: { total_size: 0, base_size: 0, weight: 0, vbytes: 0 }
        };

        const transactions = [];

        for (const tx of block.txs) {
            fileStats.total_transactions_analyzed++;

            blockSummary.size_stats.total_size += tx.totalSize;
            blockSummary.size_stats.base_size += tx.baseSize;
            blockSummary.size_stats.weight += tx.weight;
            blockSummary.size_stats.vbytes += tx.vbytes;

            fileStats.size_stats.total_size += tx.totalSize;
            fileStats.size_stats.base_size += tx.baseSize;
            fileStats.size_stats.weight += tx.weight;
            fileStats.size_stats.vbytes += tx.vbytes;

            // Record script distribution
            for (const vout of tx.vouts) {
                const type = vout.scriptType;
                blockSummary.script_type_distribution[type] = (blockSummary.script_type_distribution[type] || 0) + 1;
                fileStats.script_type_distribution[type] = (fileStats.script_type_distribution[type] || 0) + 1;
            }
            if (!tx.isCoinbase && tx.vins.every(v => v.prevout)) {
                let totalIn = 0;
                for (const vin of tx.vins) {
                    totalIn += vin.prevout.value;
                    const type = vin.prevout.scriptType;
                    blockSummary.script_type_distribution[type] = (blockSummary.script_type_distribution[type] || 0) + 1;
                    fileStats.script_type_distribution[type] = (fileStats.script_type_distribution[type] || 0) + 1;
                }
                let totalOut = 0;
                for (const vout of tx.vouts) totalOut += vout.value;
                const feeSats = totalIn - totalOut;
                const feeRate = feeSats / tx.vbytes;
                if (feeRate >= 0) {
                    blockSummary.fee_rates.push(feeRate);
                    fileStats.fee_rates.push(feeRate);
                }
            }

            // Heuristics
            const heuristics = {};
            let isFlagged = false;

            // 1. cioh
            const ciohDetected = tx.vins.length > 1 && !tx.isCoinbase;
            if (ciohDetected) {
                const inputCount = tx.vins.length;
                let ciohConfidence = 'medium';
                if (inputCount >= 10) ciohConfidence = 'very_high';
                else if (inputCount >= 3) ciohConfidence = 'high';
                heuristics.cioh = { detected: true, input_count: inputCount, confidence: ciohConfidence };
                isFlagged = true;
            } else {
                heuristics.cioh = { detected: false };
            }

            // 2. change_detection
            let changeDetected = false;
            let changeInfo = { detected: false };
            if (!tx.isCoinbase && tx.vouts.length >= 2) {
                const inTypes = new Set(tx.vins.map(vin => vin.prevout?.scriptType).filter(t => t && t !== "unknown"));
                if (inTypes.size === 1) {
                    const inType = [...inTypes][0];
                    const outMatches = tx.vouts.map((vout, index) => vout.scriptType === inType ? index : -1).filter(i => i !== -1);
                    if (outMatches.length === 1) {
                        changeInfo = {
                            detected: true,
                            likely_change_index: outMatches[0],
                            method: "script_type_match",
                            confidence: "high"
                        };
                        changeDetected = true;
                    }
                }
                if (!changeDetected && tx.vouts.length === 2) {
                    const nonRoundIndices = tx.vouts.map((vout, index) => vout.value % 10000 !== 0 ? index : -1).filter(i => i !== -1);
                    if (nonRoundIndices.length === 1 && tx.vouts[1 - nonRoundIndices[0]].value % 10000 === 0) {
                        changeInfo = {
                            detected: true,
                            likely_change_index: nonRoundIndices[0],
                            method: "round_number_exclusion",
                            confidence: "medium"
                        };
                        changeDetected = true;
                    }
                }
            }
            heuristics.change_detection = changeInfo;
            if (changeDetected) isFlagged = true;

            // 3. consolidation
            const consolidationDetected = tx.vins.length >= 3 && tx.vouts.length <= 2 && !tx.isCoinbase;
            if (consolidationDetected) {
                const ratio = tx.vins.length / tx.vouts.length;
                let consolConfidence = 'medium';
                if (ratio >= 10) consolConfidence = 'very_high';
                else if (ratio >= 5) consolConfidence = 'high';
                heuristics.consolidation = { detected: true, input_count: tx.vins.length, output_count: tx.vouts.length, confidence: consolConfidence };
                isFlagged = true;
            } else {
                heuristics.consolidation = { detected: false };
            }

            // 4. address_reuse
            let addressReuseDetected = false;
            let reusedCount = 0;
            if (!tx.isCoinbase) {
                const inScripts = new Set(tx.vins.map(vin => vin.prevout?.scriptPubKey ? vin.prevout.scriptPubKey.toString('hex') : null).filter(Boolean));
                for (const vout of tx.vouts) {
                    if (inScripts.has(vout.scriptPubKey.toString('hex'))) {
                        addressReuseDetected = true;
                        reusedCount++;
                    }
                }
            }
            if (addressReuseDetected) {
                heuristics.address_reuse = { detected: true, reused_count: reusedCount, confidence: 'certain' };
                isFlagged = true;
            } else {
                heuristics.address_reuse = { detected: false };
            }

            // 5. round_number_payment
            let roundNumberDetected = false;
            const roundIndices = [];
            if (!tx.isCoinbase) {
                tx.vouts.forEach((vout, idx) => {
                    if (vout.value > 0 && vout.value % 100000 === 0) {
                        roundNumberDetected = true;
                        roundIndices.push(idx);
                    }
                });
            }
            if (roundNumberDetected) {
                const hasNonRound = tx.vouts.some((v, i) => v.value > 0 && !roundIndices.includes(i));
                heuristics.round_number_payment = { detected: true, round_indices: roundIndices, confidence: hasNonRound ? 'high' : 'medium' };
                isFlagged = true;
            } else {
                heuristics.round_number_payment = { detected: false };
            }

            // 6. coinjoin
            let coinjoinDetected = false;
            let coinjoinInfo = { detected: false };
            if (!tx.isCoinbase && tx.vouts.length >= 3 && tx.vins.length >= 3) {
                const valueCounts = {};
                for (const vout of tx.vouts) {
                    valueCounts[vout.value] = (valueCounts[vout.value] || 0) + 1;
                }

                let maxCount = 0;
                for (const count of Object.values(valueCounts)) {
                    if (count > maxCount) maxCount = count;
                }

                // If 3 or more outputs have the identical value, we consider it a CoinJoin
                if (maxCount >= 3) {
                    coinjoinDetected = true;
                    coinjoinInfo = {
                        detected: true,
                        confidence: "high",
                        matching_outputs: maxCount
                    };
                }
            }
            heuristics.coinjoin = coinjoinInfo;
            if (coinjoinDetected) isFlagged = true;

            // 7. op_return
            let opReturnDetected = false;
            let opReturnInfo = { detected: false };
            if (!tx.isCoinbase) {
                const opReturnIndices = [];
                tx.vouts.forEach((vout, index) => {
                    if (vout.scriptType === 'op_return') {
                        opReturnIndices.push(index);
                    }
                });

                if (opReturnIndices.length > 0) {
                    opReturnDetected = true;
                    opReturnInfo = {
                        detected: true,
                        confidence: "certain",
                        indices: opReturnIndices
                    };
                }
            }
            heuristics.op_return = opReturnInfo;
            if (opReturnDetected) isFlagged = true;

            // 8. self_transfer
            let selfTransferDetected = false;
            let selfTransferInfo = { detected: false };
            if (!tx.isCoinbase && tx.vouts.length >= 1) {
                const inTypes = new Set(tx.vins.map(vin => vin.prevout?.scriptType).filter(t => t && t !== 'unknown'));
                if (inTypes.size === 1) {
                    const inType = [...inTypes][0];
                    const allOutsMatch = tx.vouts.every(vout => vout.scriptType === inType || vout.scriptType === 'op_return');
                    const hasNoRoundPayment = !roundNumberDetected;
                    if (allOutsMatch && hasNoRoundPayment && tx.vouts.length >= 2) {
                        selfTransferDetected = true;
                        selfTransferInfo = { detected: true, script_type: inType, confidence: 'high' };
                    } else if (tx.vins.length === 1 && tx.vouts.length === 1 && addressReuseDetected) {
                        selfTransferDetected = true;
                        selfTransferInfo = { detected: true, script_type: inType, confidence: 'medium' };
                    }
                }
            }
            heuristics.self_transfer = selfTransferInfo;
            if (selfTransferDetected) isFlagged = true;

            if (isFlagged) {
                fileStats.flagged_transactions++;
                blockSummary.flagged_transactions++;
            }

            // Classification
            let classification = "unknown";
            if (consolidationDetected) {
                classification = "consolidation";
            } else if (!tx.isCoinbase) {
                if (coinjoinDetected) {
                    classification = "coinjoin";
                } else if (selfTransferDetected) {
                    classification = "self_transfer";
                } else if (tx.vouts.length >= 3) {
                    classification = "batch_payment";
                } else if (tx.vouts.length === 2 && changeDetected) {
                    classification = "simple_payment";
                } else if (tx.vins.length === 1 && tx.vouts.length <= 2) {
                    classification = "simple_payment";
                }
            }
            let inputs = [];
            let outputs = [];
            const isNotable = (classification !== "unknown" && classification !== "simple_payment") || isFlagged;
            if (isNotable) {
                if (!tx.isCoinbase) {
                    inputs = tx.vins.map(vin => ({
                        value: vin.prevout ? vin.prevout.value : 0,
                        scriptType: vin.prevout ? vin.prevout.scriptType : 'unknown'
                    }));
                } else {
                    inputs = [{ value: 0, scriptType: 'coinbase' }];
                }
                outputs = tx.vouts.map(vout => ({
                    value: vout.value,
                    scriptType: vout.scriptType
                }));
            }

            transactions.push({
                txid: tx.txid,
                heuristics,
                classification,
                inputs,
                outputs,
                size_stats: {
                    total_size: tx.totalSize,
                    base_size: tx.baseSize,
                    weight: tx.weight,
                    vbytes: tx.vbytes,
                    version_size: tx.version_size,
                    inputs_size: tx.inputs_size,
                    outputs_size: tx.outputs_size,
                    witness_size: tx.witness_size,
                    locktime_size: tx.locktime_size
                }
            });
        }

        blockResults.push({
            block_hash: block.blockHash,
            block_height: block.blockHeight,
            tx_count: block.txCount,
            analysis_summary: {
                total_transactions_analyzed: blockSummary.total_transactions_analyzed,
                heuristics_applied: blockSummary.heuristics_applied,
                flagged_transactions: blockSummary.flagged_transactions,
                script_type_distribution: blockSummary.script_type_distribution,
                fee_rate_stats: computeStats(blockSummary.fee_rates),
                size_stats: blockSummary.size_stats
            },
            transactions
        });
    }

    const { fee_rates, ...restStats } = fileStats;
    const finalFileStats = {
        ...restStats,
        heuristics_applied: ["cioh", "change_detection", "consolidation", "address_reuse", "round_number_payment", "coinjoin", "op_return", "self_transfer"],
        fee_rate_stats: computeStats(fee_rates)
    };

    return {
        fileStats: finalFileStats,
        blocks: blockResults
    };
}

function computeStats(arr) {
    if (arr.length === 0) return { min_sat_vb: 0, max_sat_vb: 0, median_sat_vb: 0, mean_sat_vb: 0 };
    arr.sort((a, b) => a - b);
    const min = arr[0];
    const max = arr[arr.length - 1];
    const median = arr.length % 2 === 0 ? (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2 : arr[Math.floor(arr.length / 2)];
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
        min_sat_vb: Number(min.toFixed(2)),
        max_sat_vb: Number(max.toFixed(2)),
        median_sat_vb: Number(median.toFixed(2)),
        mean_sat_vb: Number(mean.toFixed(2))
    };
}

module.exports = { analyzeBlocks };
