const { analyzeBlocks } = require('../analyzer');

describe('analyzer.js', () => {
    describe('analyzeBlocks', () => {
        let defaultTxTemplate;

        beforeEach(() => {
            defaultTxTemplate = {
                txid: '0000000000000000000000000000000000000000000000000000000000000000',
                isCoinbase: false,
                vins: [
                    { prevout: { value: 10000, scriptType: 'p2wpkh', scriptPubKey: Buffer.from('abc', 'hex') } }
                ],
                vouts: [
                    { value: 9000, scriptType: 'p2wpkh', scriptPubKey: Buffer.from('def', 'hex') }
                ],
                totalSize: 100,
                baseSize: 50,
                weight: 250,
                vbytes: 63,
                version_size: 4,
                inputs_size: 41,
                outputs_size: 34,
                witness_size: 17,
                locktime_size: 4
            };
        });

        const wrapTxInBlock = (txs) => {
            return [{
                blockHash: '0000000000000000000000000000000000000000000000000000000000000000',
                blockHeight: 1,
                txCount: txs.length,
                txs,
                timestamp: 1234567890
            }];
        };

        it('should correctly process a basic transaction', () => {
            const blocks = wrapTxInBlock([defaultTxTemplate]);
            const result = analyzeBlocks(blocks);

            expect(result.fileStats.total_transactions_analyzed).toBe(1);
            expect(result.fileStats.flagged_transactions).toBe(0);

            const txResult = result.blocks[0].transactions[0];
            expect(txResult.classification).toBe('simple_payment'); // 1 in -> 1 out
        });

        it('should detect cioh (Common Input Ownership) heuristic', () => {
            const tx = {
                ...defaultTxTemplate,
                vins: [
                    { prevout: { value: 5000, scriptType: 'p2pkh', scriptPubKey: Buffer.from('1', 'hex') } },
                    { prevout: { value: 5000, scriptType: 'p2pkh', scriptPubKey: Buffer.from('2', 'hex') } }
                ]
            };
            const result = analyzeBlocks(wrapTxInBlock([tx]));
            const txResult = result.blocks[0].transactions[0];

            expect(txResult.heuristics.cioh.detected).toBe(true);
            expect(txResult.heuristics.cioh.input_count).toBe(2);
            expect(result.fileStats.flagged_transactions).toBe(1);
        });

        it('should detect consolidation heuristic', () => {
            const tx = {
                ...defaultTxTemplate,
                vins: [
                    { prevout: { value: 3000, scriptType: 'p2pkh', scriptPubKey: Buffer.from('1', 'hex') } },
                    { prevout: { value: 3000, scriptType: 'p2pkh', scriptPubKey: Buffer.from('2', 'hex') } },
                    { prevout: { value: 4000, scriptType: 'p2pkh', scriptPubKey: Buffer.from('3', 'hex') } }
                ],
                vouts: [
                    { value: 9500, scriptType: 'p2wpkh', scriptPubKey: Buffer.from('def', 'hex') }
                ]
            };
            const result = analyzeBlocks(wrapTxInBlock([tx]));
            const txResult = result.blocks[0].transactions[0];

            expect(txResult.heuristics.consolidation.detected).toBe(true);
            expect(txResult.heuristics.consolidation.input_count).toBe(3);
            expect(txResult.heuristics.consolidation.output_count).toBe(1);
            expect(txResult.classification).toBe('consolidation');
            expect(result.fileStats.flagged_transactions).toBe(1);
        });

        it('should detect address_reuse heuristic', () => {
            const tx = {
                ...defaultTxTemplate,
                vins: [
                    { prevout: { value: 10000, scriptType: 'p2pkh', scriptPubKey: Buffer.from('abc', 'hex') } }
                ],
                vouts: [
                    { value: 5000, scriptType: 'p2pkh', scriptPubKey: Buffer.from('abc', 'hex') },
                    { value: 4500, scriptType: 'p2sh', scriptPubKey: Buffer.from('def', 'hex') }
                ]
            };
            const result = analyzeBlocks(wrapTxInBlock([tx]));
            const txResult = result.blocks[0].transactions[0];

            expect(txResult.heuristics.address_reuse.detected).toBe(true);
            expect(txResult.heuristics.address_reuse.reused_count).toBe(1);
        });

        it('should detect round_number_payment heuristic', () => {
            const tx = {
                ...defaultTxTemplate,
                vouts: [
                    { value: 100000, scriptType: 'p2wpkh', scriptPubKey: Buffer.alloc(22) },
                    { value: 4500, scriptType: 'p2pkh', scriptPubKey: Buffer.alloc(25) }
                ]
            };
            const result = analyzeBlocks(wrapTxInBlock([tx]));
            const txResult = result.blocks[0].transactions[0];

            expect(txResult.heuristics.round_number_payment.detected).toBe(true);
            expect(txResult.heuristics.round_number_payment.round_indices).toEqual([0]);
        });

        it('should detect coinjoin heuristic', () => {
            const tx = {
                ...defaultTxTemplate,
                vins: [
                    { prevout: { value: 10000, scriptType: 'p2pkh', scriptPubKey: Buffer.alloc(25) } },
                    { prevout: { value: 10000, scriptType: 'p2pkh', scriptPubKey: Buffer.alloc(1) } },
                    { prevout: { value: 10000, scriptType: 'p2pkh', scriptPubKey: Buffer.alloc(2) } }
                ],
                vouts: [
                    { value: 8000, scriptType: 'p2wpkh', scriptPubKey: Buffer.alloc(22) },
                    { value: 8000, scriptType: 'p2wpkh', scriptPubKey: Buffer.alloc(23) },
                    { value: 8000, scriptType: 'p2wpkh', scriptPubKey: Buffer.alloc(24) },
                    { value: 1000, scriptType: 'p2wpkh', scriptPubKey: Buffer.alloc(20) }
                ]
            };
            const result = analyzeBlocks(wrapTxInBlock([tx]));
            const txResult = result.blocks[0].transactions[0];

            expect(txResult.heuristics.coinjoin.detected).toBe(true);
            expect(txResult.heuristics.coinjoin.matching_outputs).toBe(3);
            expect(txResult.classification).toBe('coinjoin');
        });

        it('should detect op_return heuristic', () => {
            const tx = {
                ...defaultTxTemplate,
                vouts: [
                    { value: 9000, scriptType: 'p2wpkh', scriptPubKey: Buffer.alloc(22) },
                    { value: 0, scriptType: 'op_return', scriptPubKey: Buffer.from('6a1234', 'hex') }
                ]
            };
            const result = analyzeBlocks(wrapTxInBlock([tx]));
            const txResult = result.blocks[0].transactions[0];

            expect(txResult.heuristics.op_return.detected).toBe(true);
            expect(txResult.heuristics.op_return.indices).toEqual([1]);
        });

        it('should detect change_detection heuristic via script_type_match', () => {
            const tx = {
                ...defaultTxTemplate,
                vins: [
                    { prevout: { value: 20000, scriptType: 'p2wpkh', scriptPubKey: Buffer.alloc(22) } }
                ],
                vouts: [
                    { value: 15000, scriptType: 'p2pkh', scriptPubKey: Buffer.alloc(25) },
                    { value: 4500, scriptType: 'p2wpkh', scriptPubKey: Buffer.alloc(22) }
                ]
            };
            const result = analyzeBlocks(wrapTxInBlock([tx]));
            const txResult = result.blocks[0].transactions[0];

            // Should match since input is p2wpkh and exactly ONE output is p2wpkh
            expect(txResult.heuristics.change_detection.detected).toBe(true);
            expect(txResult.heuristics.change_detection.likely_change_index).toBe(1);
            expect(txResult.heuristics.change_detection.method).toBe('script_type_match');
            expect(txResult.classification).toBe('simple_payment');
        });

        it('should detect self_transfer heuristic', () => {
            const tx = {
                ...defaultTxTemplate,
                vins: [
                    { prevout: { value: 10000, scriptType: 'p2tr', scriptPubKey: Buffer.alloc(34) } }
                ],
                vouts: [
                    { value: 5000, scriptType: 'p2tr', scriptPubKey: Buffer.alloc(34) },
                    { value: 4500, scriptType: 'p2tr', scriptPubKey: Buffer.alloc(34) }
                ]
            };
            const result = analyzeBlocks(wrapTxInBlock([tx]));
            const txResult = result.blocks[0].transactions[0];

            // No round payment, and all inputs/outputs are same script_type
            expect(txResult.heuristics.self_transfer.detected).toBe(true);
            expect(txResult.classification).toBe('self_transfer');
        });

        it('should detect peeling_chain heuristic', () => {
            const tx = {
                ...defaultTxTemplate,
                vins: [
                    { prevout: { value: 100000, scriptType: 'p2wpkh', scriptPubKey: Buffer.alloc(22) } }
                ],
                vouts: [
                    { value: 5000, scriptType: 'p2pkh', scriptPubKey: Buffer.alloc(25) },
                    { value: 94000, scriptType: 'p2wpkh', scriptPubKey: Buffer.alloc(22) } // Substantial change
                ]
            };
            const result = analyzeBlocks(wrapTxInBlock([tx]));
            const txResult = result.blocks[0].transactions[0];

            expect(txResult.heuristics.peeling_chain.detected).toBe(true);
            expect(txResult.heuristics.peeling_chain.confidence).toBe('high');
            expect(txResult.heuristics.peeling_chain.likely_change_index).toBe(1);
        });

        it('should detect change_detection heuristic via larger_output fallback', () => {
            const tx = {
                ...defaultTxTemplate,
                vins: [
                    { prevout: { value: 100000, scriptType: 'unknown', scriptPubKey: Buffer.alloc(0) } }
                ],
                vouts: [
                    { value: 95000, scriptType: 'p2tr', scriptPubKey: Buffer.alloc(34) },
                    { value: 4500, scriptType: 'p2tr', scriptPubKey: Buffer.alloc(34) }
                ]
            };
            const result = analyzeBlocks(wrapTxInBlock([tx]));
            const txResult = result.blocks[0].transactions[0];

            expect(txResult.heuristics.change_detection.detected).toBe(true);
            expect(txResult.heuristics.change_detection.likely_change_index).toBe(0);
            expect(txResult.heuristics.change_detection.method).toBe('larger_output');
            expect(txResult.heuristics.change_detection.confidence).toBe('low');
        });
    });
});
