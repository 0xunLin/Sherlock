document.addEventListener('DOMContentLoaded', () => {
    // ---- Dictionary Logic ----
    const dictContent = document.getElementById('dict-content');
    const dictNext = document.getElementById('dict-next');

    const definitions = [
        {
            word: "heuristic",
            pronunciation: "[hyoo-ris-tik] <em>noun</em>",
            definition: "Rules of thumb or probabilistic algorithms used to link addresses to entities or identify the true nature of a Bitcoin transaction.",
            seeAlso: "See also: <em>Common Input Ownership, Change Detection</em>.",
            variationHeading: "Variation: confident estimation",
            variationQuote: "“We apply heuristics to follow the money.”"
        },
        {
            word: "consolidation",
            pronunciation: "[kuhn-sol-i-dey-shuhn] <em>noun</em>",
            definition: "A transaction where a user combines many small pieces of bitcoin (UTXOs) into a single larger piece to save on future fees.",
            seeAlso: "See also: <em>UTXO Sweeping, Fee Optimization</em>.",
            variationHeading: "Variation: house cleaning",
            variationQuote: "“They did a massive consolidation when fees dropped.”"
        },
        {
            word: "coinjoin",
            pronunciation: "[koyn-joyn] <em>noun</em>",
            definition: "A collaborative transaction where multiple users mix their coins together to obscure the trail of ownership.",
            seeAlso: "See also: <em>Wasabi, Whirlpool, Mixers</em>.",
            variationHeading: "Variation: privacy enhancement",
            variationQuote: "“Detecting a coinjoin requires looking for uniform outputs.”"
        },
        {
            word: "batch payment",
            pronunciation: "[bach pey-muhnt] <em>noun</em>",
            definition: "A single transaction constructed by an exchange or business to pay many different users simultaneously, saving block space.",
            seeAlso: "See also: <em>Exchange Withdrawals, Script Pubkey</em>.",
            variationHeading: "Variation: efficiency scaling",
            variationQuote: "“That one batch payment saved them thousands in fees.”"
        },
        {
            word: "simple payment",
            pronunciation: "[sim-puhl pey-muhnt] <em>noun</em>",
            definition: "A standard, everyday Bitcoin transaction typically consisting of 1 input and 2 outputs (a payment and the return change).",
            seeAlso: "See also: <em>Peer-to-Peer, UTXO</em>.",
            variationHeading: "Variation: retail transaction",
            variationQuote: "“Just a simple payment to buy a coffee.”"
        },
        {
            word: "change detection",
            pronunciation: "[cheynj dih-tek-shuhn] <em>noun</em>",
            definition: "A heuristic pattern used to guess which output of a transaction belongs to the sender returning their own excess bitcoin.",
            seeAlso: "See also: <em>Round Number Exclusion, Script Match</em>.",
            variationHeading: "Variation: output disambiguation",
            variationQuote: "“Change detection tells us the sender kept 95% of the UTXO.”"
        },
        {
            word: "self transfer",
            pronunciation: "[self trans-fur] <em>noun</em>",
            definition: "A transaction where the sender pays entirely to themselves, often revealed by exactly matching input and output addresses.",
            seeAlso: "See also: <em>Address Reuse, UTXO Management</em>.",
            variationHeading: "Variation: internal movement",
            variationQuote: "“It looks like a payment, but it was just a self transfer.”"
        },
        {
            word: "round number payment",
            pronunciation: "[round num-ber pey] <em>noun</em>",
            definition: "An output matching a human-readable round amount (like 0.05 BTC), often identifying the true payment rather than the change.",
            seeAlso: "See also: <em>Change Detection</em>.",
            variationHeading: "Variation: human behavior",
            variationQuote: "“The round output was clearly the payment.”"
        },
        {
            word: "op return",
            pronunciation: "[op ri-turn] <em>noun</em>",
            definition: "A script opcode used to mark an output as provably unspendable, often used to embed arbitrary data like text or digital artifacts.",
            seeAlso: "See also: <em>Inscriptions, Data Storage</em>.",
            variationHeading: "Variation: blockchain graffiti",
            variationQuote: "“They embedded a message in the chain using an op_return.”"
        },
        {
            word: "peeling chain",
            pronunciation: "[pee-ling cheyn] <em>noun</em>",
            definition: "A series of transactions where a large amount is slowly 'peeled' off into smaller payments across many steps, often to obscure the final destination.",
            seeAlso: "See also: <em>Mixers, Change Outputs</em>.",
            variationHeading: "Variation: structured smurfing",
            variationQuote: "“The stolen funds were laundered through a long peeling chain.”"
        },
        {
            word: "common input ownership",
            pronunciation: "[CIOH] <em>noun</em>",
            definition: "A heuristic assuming all inputs to a transaction belong to the same entity, as they are signed together.",
            seeAlso: "See also: <em>CoinJoin</em>.",
            variationHeading: "Variation: clustering",
            variationQuote: "“CIOH clustered addresses to one user.”"
        },
        {
            word: "address reuse",
            pronunciation: "[ad-dres ree-yoos] <em>noun</em>",
            definition: "The practice of using the same Bitcoin address to receive or send funds multiple times, severely compromising the privacy of the user.",
            seeAlso: "See also: <em>Self Transfer, Privacy</em>.",
            variationHeading: "Variation: privacy leak",
            variationQuote: "“Address reuse makes it easy to track their entire payment history.”"
        }
    ];

    let currentDictIdx = 0;

    if (dictNext && dictContent) {
        dictNext.addEventListener('click', () => {
            currentDictIdx = (currentDictIdx + 1) % definitions.length;
            const def = definitions[currentDictIdx];

            // simple fade effect
            dictContent.classList.remove('dict-fade');
            void dictContent.offsetWidth; // trigger reflow
            dictContent.classList.add('dict-fade');

            if (def.word === "round number payment" || def.word === "common input ownership") {
                dictContent.classList.add('compact-card');
            } else {
                dictContent.classList.remove('compact-card');
            }

            dictContent.innerHTML = `
                <h1>${def.word}</h1>
                <p class="pronunciation">${def.pronunciation}</p>
                <hr>
                <p class="definition">${def.definition}</p>
                <p class="see-also">${def.seeAlso}</p>
                <div class="variation">
                    <p>${def.variationHeading}</p>
                    <p>${def.variationQuote}</p>
                </div>
            `;
        });
    }

    // ---- Theme Toggle Logic ----
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        // Load preference — Victorian is the default on first visit
        const isModern = localStorage.getItem('victorianTheme') === 'false';
        if (!isModern) {
            document.body.classList.add('victorian-theme');
            themeBtn.textContent = 'MODERN MODE';
        }

        // Toggle preference
        themeBtn.addEventListener('click', () => {
            const willBeVictorian = !document.body.classList.contains('victorian-theme');
            if (willBeVictorian) {
                document.body.classList.add('victorian-theme');
                localStorage.setItem('victorianTheme', 'true');
                themeBtn.textContent = 'MODERN MODE';
            } else {
                document.body.classList.remove('victorian-theme');
                localStorage.setItem('victorianTheme', 'false');
                themeBtn.textContent = 'VICTORIAN MODE';
            }
        });
    }

    // ---- Option C: Functional Modals Logic ----
    const btnGlossary = document.getElementById('btn-glossary');
    const glossaryModal = document.getElementById('glossary-modal');
    const closeGlossary = document.getElementById('close-glossary-modal');
    const glossaryContent = document.getElementById('glossary-content');
    const glossarySearch = document.getElementById('glossary-search');

    const btnTracker = document.getElementById('btn-tracker');
    const trackerModal = document.getElementById('tracker-modal');
    const closeTracker = document.getElementById('close-tracker-modal');
    const trackerInput = document.getElementById('tracker-input');
    const btnTrace = document.getElementById('btn-trace');
    const trackerStatus = document.getElementById('tracker-status');

    const btnImport = document.getElementById('btn-import');
    const importModal = document.getElementById('import-modal');
    const closeImport = document.getElementById('close-import-modal');

    const blkInput = document.getElementById('blk-file-input');
    const revInput = document.getElementById('rev-file-input');
    const xorInput = document.getElementById('xor-file-input');
    const blkNameDisplay = document.getElementById('blk-file-name');
    const revNameDisplay = document.getElementById('rev-file-name');
    const xorNameDisplay = document.getElementById('xor-file-name');

    const btnUpload = document.getElementById('btn-upload-file');
    const uploadStatus = document.getElementById('upload-status');

    // 1. Glossary Logic
    function renderGlossary(filter = '') {
        const terms = [
            { term: 'Address Reuse', def: 'A privacy-damaging practice where an entity receives and sends from the identical address.' },
            { term: 'Block', def: 'A collection of confirmed transactions bundled together and added to the blockchain.' },
            { term: 'Block Hash', def: 'A unique cryptographic identifier for a specific block.' },
            { term: 'Blockchain', def: 'A distributed public ledger containing the history of every Bitcoin transaction.' },
            { term: 'Change Detection', def: 'Identifying which output returns funds to the sender by looking for matching script types or odd values.' },
            { term: 'Coinbase Transaction', def: 'The first transaction in a block, created by the miner, which generates new bitcoin.' },
            { term: 'CoinJoin', def: 'A collaborative transaction mixing multiple users\' inputs into equal-valued outputs to break tracking.' },
            { term: 'Common Input Ownership (CIOH)', def: 'Assumes all inputs in a single transaction belong to the same entity.' },
            { term: 'Consolidation', def: 'A transaction sweeping multiple small UTXOs into a single output, often during low fees.' },
            { term: 'Data Storage', def: 'The practice of embedding arbitrary information, like text or images, directly into the blockchain using OP_RETURN or witness data.' },
            { term: 'Dust', def: 'An amount of satoshis that is smaller than the cost to spend it in miner fees.' },
            { term: 'Exchange Withdrawals', def: 'Transactions where a cryptocurrency exchange sends funds out of its hot wallets to individual user addresses.' },
            { term: 'Fee Rate', def: 'Usually measured in satoshis per virtual byte (sat/vB), dictating priority in the mempool.' },
            { term: 'Halving', def: 'An event occurring approximately every four years where the block reward given to miners is cut in half.' },
            { term: 'Hash Rate', def: 'The total computational power being used to mine and process transactions on the network.' },
            { term: 'HD Wallet', def: 'Hierarchical Deterministic wallet. A wallet that derives all its keys and addresses from a single master seed.' },
            { term: 'Heuristic', def: 'A probabilistic rule of thumb to infer real-world behavior from blockchain data.' },
            { term: 'Lightning Network', def: 'A Layer 2 payment protocol operating on top of Bitcoin to enable fast, low-fee microtransactions.' },
            { term: 'Locktime (nLockTime)', def: 'A transaction or block level parameter enforcing that a transaction cannot be mined until a certain time or block height.' },
            { term: 'Mempool', def: 'The queue of unconfirmed transactions sitting in a node\'s memory waiting to be mined into a block.' },
            { term: 'Mining', def: 'The process of performing computational work to secure the network, append blocks, and earn newly minted bitcoins.' },
            { term: 'Mixers', def: 'Services or protocols (like CoinJoin) designed to obfuscate the history and ownership of cryptocurrency funds.' },
            { term: 'Multisig', def: 'A script configuration requiring multiple private keys to authorize a transaction.' },
            { term: 'Node', def: 'A computer participating in the Bitcoin network, validating and relaying transactions and blocks.' },
            { term: 'OP_RETURN', def: 'A script opcode used to mark an output as provably unspendable, often used to embed arbitrary data.' },
            { term: 'Peel Chain', def: 'A series of transactions where a large amount is slowly "peeled" off into smaller payments across many steps.' },
            { term: 'Peer-to-Peer', def: 'A decentralized network architecture where participants communicate directly with each other without a central server.' },
            { term: 'Privacy', def: 'In Bitcoin, the ability to transact without revealing real-world identity or the entire history of one\'s funds.' },
            { term: 'Private Key', def: 'A secret alphanumeric password/number used to spend bitcoins. Must be kept secure.' },
            { term: 'PSBT', def: 'Partially Signed Bitcoin Transaction. A standard format allowing multiple parties to construct and sign a transaction offline.' },
            { term: 'Public Key', def: 'Derived from the private key, used to generate receiving addresses and verify signatures.' },
            { term: 'RBF (Replace-By-Fee)', def: 'A feature allowing a sender to bump the fee of an unconfirmed transaction by broadcasting a replacement.' },
            { term: 'Round Number Exclusion', def: 'A heuristic determining change outputs by eliminating outputs that are exact round numbers.' },
            { term: 'Round Number Payment', def: 'A payment matching a specific human-readable round amount, like exactly 0.05 BTC.' },
            { term: 'Satoshi (sat)', def: 'The smallest unit of Bitcoin. One hundred million satoshis equal one Bitcoin (1 BTC = 100,000,000 sats).' },
            { term: 'Script Match', def: 'A heuristic for change detection that looks for outputs matching the input script type (e.g., P2WPKH to P2WPKH).' },
            { term: 'ScriptPubKey', def: 'The locking script placed on an output that defines the conditions to spend it (the "address").' },
            { term: 'SegWit', def: 'Segregated Witness. A protocol upgrade separating signature data from the transaction to block space.' },
            { term: 'Self Transfer', def: 'When a wallet spends a UTXO but sends the entire amount (minus fees) back to itself.' },
            { term: 'SPV', def: 'Simplified Payment Verification. A method for lightweight clients to verify transactions without downloading the full blockchain.' },
            { term: 'Taproot', def: 'A recent upgrade allowing complex smart contracts to look exactly like standard single-signature transactions.' },
            { term: 'UTXO', def: 'Unspent Transaction Output. The atomic piece of Bitcoin that can be spent.' },
            { term: 'UTXO Management', def: 'The practice of organizing and consolidating UTXOs in a wallet to optimize fees and privacy.' },
            { term: 'UTXO Sweeping', def: 'The act of spending all available UTXOs from one or more addresses into a single new output.' },
            { term: 'Wallet', def: 'Software or hardware that manages a user\'s private keys and interacts with the Bitcoin network.' },
            { term: 'Wasabi', def: 'A popular privacy-focused Bitcoin wallet known for integrating CoinJoin natively.' },
            { term: 'Whirlpool', def: 'A specific CoinJoin implementation, most famously used by the Samourai Wallet.' }
        ];

        glossaryContent.innerHTML = '';
        terms.filter(t => t.term.toLowerCase().includes(filter.toLowerCase()) || t.def.toLowerCase().includes(filter.toLowerCase()))
            .forEach(t => {
                const el = document.createElement('div');
                el.className = 'glossary-item';
                el.innerHTML = `<div class="glossary-term">${t.term}</div><div class="glossary-def muted">${t.def}</div>`;
                glossaryContent.appendChild(el);
            });
    }

    if (btnGlossary) {
        btnGlossary.addEventListener('click', () => {
            renderGlossary();
            glossaryModal.style.display = 'flex';
        });
        closeGlossary.addEventListener('click', () => glossaryModal.style.display = 'none');
        glossarySearch.addEventListener('input', (e) => renderGlossary(e.target.value));
        glossaryModal.addEventListener('click', (e) => { if (e.target === glossaryModal) glossaryModal.style.display = 'none'; });
    }

    // 2. Tracker Logic
    if (btnTracker) {
        btnTracker.addEventListener('click', () => {
            trackerModal.style.display = 'flex';
            trackerInput.value = '';
            trackerStatus.textContent = '';
        });
        closeTracker.addEventListener('click', () => trackerModal.style.display = 'none');
        trackerModal.addEventListener('click', (e) => { if (e.target === trackerModal) trackerModal.style.display = 'none'; });

        btnTrace.addEventListener('click', () => {
            const txid = trackerInput.value.trim();
            if (txid.length !== 64) {
                trackerStatus.textContent = '* Invalid length for a TXID.';
                trackerStatus.style.color = 'var(--color-danger)';
                return;
            }
            if (!currentData || !currentData.blocks) {
                trackerStatus.textContent = '* No parsed block data loaded.';
                trackerStatus.style.color = 'var(--color-warning)';
                return;
            }

            let foundTx = null;
            for (const b of currentData.blocks) {
                foundTx = b.transactions.find(t => t.txid === txid);
                if (foundTx) break;
            }

            if (foundTx) {
                showTxModal(foundTx);
                trackerModal.style.display = 'none';
            } else {
                trackerStatus.textContent = '* TXID not found in loaded blocks.';
                trackerStatus.style.color = 'var(--color-danger)';
            }
        });
    }

    // 3. Import Logic
    function checkImportReady() {
        if (blkInput.files.length > 0 && revInput.files.length > 0 && xorInput.files.length > 0) {
            btnUpload.disabled = false;
        } else {
            btnUpload.disabled = true;
        }
    }

    if (btnImport) {
        btnImport.addEventListener('click', () => {
            importModal.style.display = 'flex';
            blkInput.value = '';
            revInput.value = '';
            xorInput.value = '';
            blkNameDisplay.textContent = 'Missing blk*.dat';
            revNameDisplay.textContent = 'Missing rev*.dat';
            xorNameDisplay.textContent = 'Missing xor.dat';
            btnUpload.disabled = true;
            uploadStatus.textContent = '';
        });
        closeImport.addEventListener('click', () => importModal.style.display = 'none');
        importModal.addEventListener('click', (e) => { if (e.target === importModal) importModal.style.display = 'none'; });

        blkInput.addEventListener('change', () => {
            blkNameDisplay.textContent = blkInput.files.length > 0 ? blkInput.files[0].name : 'Missing blk*.dat';
            checkImportReady();
        });
        revInput.addEventListener('change', () => {
            revNameDisplay.textContent = revInput.files.length > 0 ? revInput.files[0].name : 'Missing rev*.dat';
            checkImportReady();
        });
        xorInput.addEventListener('change', () => {
            xorNameDisplay.textContent = xorInput.files.length > 0 ? xorInput.files[0].name : 'Missing xor.dat';
            checkImportReady();
        });

        btnUpload.addEventListener('click', async () => {
            if (btnUpload.disabled) return;

            uploadStatus.textContent = 'Uploading and analyzing files...';
            uploadStatus.style.color = 'var(--text-dark)';
            btnUpload.disabled = true;

            const formData = new FormData();
            formData.append('blkFile', blkInput.files[0]);
            formData.append('revFile', revInput.files[0]);
            formData.append('xorFile', xorInput.files[0]);

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                let data;
                try {
                    data = await res.json();
                } catch (e) {
                    throw new Error('Server returned invalid data');
                }

                if (!res.ok) {
                    throw new Error(data.error || 'Upload failed');
                }

                uploadStatus.textContent = 'Success! Files analyzed.';
                uploadStatus.style.color = 'var(--color-success)';

                // Refresh blocks list and auto-load if stem returned
                await fetchBlocks();
                if (data.stem) {
                    fileSelector.value = data.stem;
                    loadBlockData(data.stem);
                }

                setTimeout(() => importModal.style.display = 'none', 1500);
            } catch (err) {
                console.error(err);
                uploadStatus.textContent = err.message || 'Error processing files.';
                uploadStatus.style.color = 'var(--color-danger)';
                btnUpload.disabled = false;
            }
        });
    }


    // ---- Scrollytelling Nav Logic ----
    const navPills = document.querySelectorAll('.fixed-nav .nav-pill');
    const sections = document.querySelectorAll('.slide');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Remove active class from all pills
                navPills.forEach(pill => {
                    pill.classList.remove('active');
                    // reset background for active text except first one
                    if (pill.getAttribute('data-target') === 'hero') {
                        // Handled by CSS
                    }
                });

                // Add active class to corresponding pill
                const targetId = entry.target.id;
                const activePill = document.querySelector(`.fixed-nav .nav-pill[data-target="${targetId}"]`);
                if (activePill) {
                    activePill.classList.add('active');
                }
            }
        });
    }, { threshold: 0.4 });

    sections.forEach(sec => observer.observe(sec));


    // ---- Dashboard Logic ----
    const fileSelector = document.getElementById('file-selector');
    const dbContent = document.getElementById('dashboard-content');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const blockNavList = document.getElementById('block-nav-list');
    const blocksContainer = document.getElementById('blocks-container');
    const txFilter = document.getElementById('tx-filter');

    const txModal = document.getElementById('tx-modal');
    const closeModal = document.getElementById('close-modal');
    const modalBody = document.getElementById('modal-body');

    const blocksModal = document.getElementById('blocks-modal');
    const closeBlocksModal = document.getElementById('close-blocks-modal');
    const blocksModalBody = document.getElementById('blocks-modal-body');

    let currentData = null;

    fetchBlocks();

    const handleCopyClick = (e) => {
        const copyElement = e.target.closest('.copyable-hash');
        if (copyElement) {
            const hash = copyElement.getAttribute('data-hash');
            navigator.clipboard.writeText(hash).then(() => {
                const badge = copyElement.querySelector('.copy-badge');
                if (badge) {
                    const originalText = badge.textContent;
                    badge.textContent = 'Copied!';
                    badge.classList.add('copied');
                    setTimeout(() => {
                        badge.textContent = originalText;
                        badge.classList.remove('copied');
                    }, 2000);
                }
            });
        }
    };

    // Global copy handler for block hashes
    if (blocksContainer) {
        blocksContainer.addEventListener('click', handleCopyClick);
    }

    fileSelector.addEventListener('change', (e) => {
        const stem = e.target.value;
        if (stem) {
            loadBlockData(stem);
        } else {
            showEmptyState();
        }
    });

    txFilter.addEventListener('change', () => {
        if (currentData && currentData.blocks) {
            const activeTab = document.querySelector('.dash-tab.active');
            if (activeTab && activeTab.textContent.startsWith('Block')) {
                const heightMatch = activeTab.textContent.match(/Block (\d+)/);
                if (heightMatch) {
                    const block = currentData.blocks.find(b => b.block_height == heightMatch[1]);
                    if (block) renderBlockView(block);
                }
            } else if (activeTab && activeTab.id === 'more-blocks-tab') {
                const heightMatch = activeTab.textContent.match(/Block (\d+)/);
                if (heightMatch) {
                    const block = currentData.blocks.find(b => b.block_height == heightMatch[1]);
                    if (block) renderBlockView(block);
                }
            }
        }
    });

    closeModal.addEventListener('click', () => {
        txModal.style.display = 'none';
    });
    txModal.addEventListener('click', (e) => {
        if (e.target === txModal) txModal.style.display = 'none';
        handleCopyClick(e);
    });

    closeBlocksModal.addEventListener('click', () => {
        blocksModal.style.display = 'none';
    });
    blocksModal.addEventListener('click', (e) => {
        if (e.target === blocksModal) blocksModal.style.display = 'none';
    });

    async function fetchBlocks() {
        try {
            const res = await fetch('/api/blocks');
            const data = await res.json();

            fileSelector.innerHTML = '<option value="">Select a block file...</option>';
            if (data.blocks && data.blocks.length > 0) {
                data.blocks.forEach(stem => {
                    const opt = document.createElement('option');
                    opt.value = stem;
                    opt.textContent = stem + '.dat';
                    fileSelector.appendChild(opt);
                });
                fileSelector.disabled = false;
            } else {
                fileSelector.innerHTML = '<option value="">No analyzed files found</option>';
            }
            showEmptyState();
        } catch (err) {
            console.error('Failed to fetch blocks', err);
            fileSelector.innerHTML = '<option value="">Error loading blocks</option>';
        }
    }

    async function loadBlockData(stem) {
        showLoadingState();
        try {
            document.querySelector('.dashboard-pill').click(); // scroll to dash if not there
            const res = await fetch(`/api/blocks/${stem}`);
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            currentData = data;
            renderDashboard(data);
        } catch (err) {
            console.error(err);
            showEmptyState();
        }
    }

    function renderDashboard(data) {
        loadingState.style.display = 'none';
        emptyState.style.display = 'none';
        dbContent.style.display = 'block';

        const summary = data.analysis_summary;
        const flaggedPct = summary.total_transactions_analyzed > 0 ? (summary.flagged_transactions / summary.total_transactions_analyzed * 100).toFixed(1) : 0;
        document.getElementById('stat-total').textContent = summary.total_transactions_analyzed.toLocaleString();
        document.getElementById('stat-flagged').textContent = `${summary.flagged_transactions.toLocaleString()} (${flaggedPct}%)`;
        document.getElementById('stat-fee').textContent = summary.fee_rate_stats.mean_sat_vb.toFixed(1);
        const detectedHeuristics = new Set();
        data.blocks.forEach(b => {
            b.transactions.forEach(t => {
                Object.keys(t.heuristics).forEach(h => {
                    if (t.heuristics[h] && t.heuristics[h].detected) {
                        detectedHeuristics.add(h);
                    }
                });
            });
        });
        document.getElementById('stat-heuristics').textContent = detectedHeuristics.size;

        blockNavList.innerHTML = '';
        blocksContainer.innerHTML = '';

        const maxVisible = window.innerWidth < 768 ? 4 : 10;
        data.blocks.forEach((block, idx) => {
            if (idx < maxVisible) {
                // Tab
                const tab = document.createElement('div');
                tab.className = 'dash-tab' + (idx === 0 ? ' active' : '');
                tab.textContent = `Block ${block.block_height}`;
                tab.onclick = () => {
                    document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    // reset the more blocks text if needed
                    const moreBtn = document.getElementById('more-blocks-tab');
                    if (moreBtn) moreBtn.innerHTML = `<strong>More Blocks ▾</strong>`;
                    renderBlockView(block);
                };
                blockNavList.appendChild(tab);
            }

            // initially render first block
            if (idx === 0) renderBlockView(block);
        });

        if (data.blocks.length > maxVisible) {
            const moreBtn = document.createElement('div');
            moreBtn.className = 'dash-tab';
            moreBtn.id = 'more-blocks-tab';
            moreBtn.innerHTML = `<strong>More Blocks ▾</strong>`;
            moreBtn.onclick = () => {
                showBlocksModal(data.blocks);
            };
            blockNavList.appendChild(moreBtn);
        }
    }

    function showBlocksModal(blocks) {
        blocksModalBody.innerHTML = '';
        blocks.forEach((b, i) => {
            const btn = document.createElement('button');
            btn.className = 'badge unknown';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '1em';
            btn.style.padding = '8px 12px';
            btn.style.border = '1px solid #ccc';
            btn.textContent = `Block ${b.block_height}`;
            btn.onclick = () => {
                blocksModal.style.display = 'none';

                document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));

                if (i < 10) {
                    const tabs = document.querySelectorAll('.dash-tab');
                    if (tabs[i]) tabs[i].classList.add('active');
                    const moreBtn = document.getElementById('more-blocks-tab');
                    if (moreBtn) moreBtn.innerHTML = `<strong>More Blocks ▾</strong>`;
                } else {
                    const moreBtn = document.getElementById('more-blocks-tab');
                    if (moreBtn) {
                        moreBtn.classList.add('active');
                        moreBtn.innerHTML = `<strong>Block ${b.block_height} ▾</strong>`;
                    }
                }

                renderBlockView(b);
            };
            blocksModalBody.appendChild(btn);
        });
        blocksModal.style.display = 'flex';
    }

    function renderBlockView(block) {
        blocksContainer.innerHTML = '';

        const headerInfo = document.createElement('div');
        headerInfo.className = 'block-header-info';
        let byteHtml = '';
        if (block.analysis_summary && block.analysis_summary.size_stats) {
            const stats = block.analysis_summary.size_stats;
            const total = stats.total_size;
            if (stats.version_size !== undefined) {
                const verPct = total > 0 ? (stats.version_size / total * 100) : 0;
                const inPct = total > 0 ? (stats.inputs_size / total * 100) : 0;
                const outPct = total > 0 ? (stats.outputs_size / total * 100) : 0;
                const witPct = total > 0 ? (stats.witness_size / total * 100) : 0;
                const lockPct = total > 0 ? (stats.locktime_size / total * 100) : 0;

                byteHtml = `
            <div style="width: 100%; margin-top: 15px; text-align: left; grid-column: 1 / -1;">
                <div style="margin-bottom: 5px;"><strong>BLOCK BYTE BREAKDOWN:</strong> <span class="muted" style="font-size: 0.85em; margin-left:10px;">Hover for details</span></div>
                <div class="byte-bar tooltip-container" title="Version: ${stats.version_size} B | Inputs: ${stats.inputs_size} B | Outputs: ${stats.outputs_size} B | Witness: ${stats.witness_size} B | Locktime: ${stats.locktime_size} B">
                    <div class="byte-version" style="width: ${verPct}%;"></div>
                    <div class="byte-inputs" style="width: ${inPct}%;"></div>
                    <div class="byte-outputs" style="width: ${outPct}%;"></div>
                    <div class="byte-witness" style="width: ${witPct}%;"></div>
                    <div class="byte-locktime" style="width: ${lockPct}%;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 0.85em; margin-top: 5px;" class="muted">
                    <span><strong>Total:</strong> ${(stats.total_size / 1024 / 1024).toFixed(2)} MB / ${stats.total_size} B</span>
                    <span><strong>Weight:</strong> ${stats.weight} WU</span>
                    <span><strong>vBytes:</strong> ${stats.vbytes} vB</span>
                </div>
            </div>`;
            } else {
                const witnessSize = stats.total_size - stats.base_size;
                const basePct = stats.total_size > 0 ? (stats.base_size / stats.total_size * 100) : 0;
                const witPct = stats.total_size > 0 ? (witnessSize / stats.total_size * 100) : 0;

                byteHtml = `
            <div style="width: 100%; margin-top: 15px; text-align: left; grid-column: 1 / -1;">
                <div style="margin-bottom: 5px;"><strong>BLOCK BYTE BREAKDOWN:</strong> <span class="muted" style="font-size: 0.85em; margin-left:10px;">Hover for details</span></div>
                <div class="byte-bar tooltip-container" title="Base: ${stats.base_size} B | Witness: ${witnessSize} B">
                    <div class="byte-base" style="width: ${basePct}%;"></div>
                    <div class="byte-witness" style="width: ${witPct}%;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 0.85em; margin-top: 5px;" class="muted">
                    <span><strong>Total:</strong> ${(stats.total_size / 1024 / 1024).toFixed(2)} MB / ${stats.total_size} B</span>
                    <span><strong>Weight:</strong> ${stats.weight} WU</span>
                    <span><strong>vBytes:</strong> ${stats.vbytes} vB</span>
                </div>
            </div>`;
            }
        }

        const blockPct = block.tx_count > 0 ? (block.analysis_summary.flagged_transactions / block.tx_count * 100).toFixed(1) : 0;
        headerInfo.innerHTML = `
            <div class="copyable-hash" data-hash="${block.block_hash}" title="Click to copy full hash"><strong>HASH:</strong><br>${block.block_hash.substring(0, 16)}... <span class="copy-badge">copy</span></div>
            <div><strong>TXS:</strong><br>${block.tx_count}</div>
            <div><strong>FLAGGED:</strong><br>${block.analysis_summary.flagged_transactions} (${blockPct}%)</div>
            ${byteHtml}
        `;
        blocksContainer.appendChild(headerInfo);

        const table = document.createElement('table');
        table.className = 'tx-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>TXID</th>
                    <th>Classification</th>
                    <th>Heuristics Detected</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');

        const filterVal = txFilter ? txFilter.value : 'all';
        let viewableTxs = block.transactions;

        if (filterVal !== 'all') {
            if (filterVal === 'flagged') {
                viewableTxs = viewableTxs.filter(t => Object.values(t.heuristics).some(h => h.detected));
            } else if (filterVal.startsWith('h_')) {
                const heuristicKey = filterVal.substring(2);
                viewableTxs = viewableTxs.filter(t => t.heuristics[heuristicKey] && t.heuristics[heuristicKey].detected);
            } else {
                viewableTxs = viewableTxs.filter(t => t.classification === filterVal);
            }
        } else {
            viewableTxs = viewableTxs.filter(t => t.classification !== 'unknown' && t.classification !== 'simple_payment' || Object.values(t.heuristics).some(h => h.detected));
        }

        const limit = 100;
        viewableTxs.slice(0, limit).forEach(tx => {
            const tr = document.createElement('tr');

            const heuris = Object.keys(tx.heuristics).filter(k => tx.heuristics[k].detected);
            let hHtml = heuris.map(h => `<span class="h-pill active">${h}</span>`).join('');
            if (!hHtml) hHtml = `<span class="h-pill">None</span>`;

            tr.innerHTML = `
                <td><span class="tx-id-link" data-txid="${tx.txid}">${tx.txid.substring(0, 16)}...</span></td>
                <td><span class="badge ${tx.classification}">${tx.classification}</span></td>
                <td>${hHtml}</td>
            `;
            tbody.appendChild(tr);
        });

        blocksContainer.appendChild(table);

        if (viewableTxs.length > limit) {
            const msg = document.createElement('p');
            msg.style.padding = '15px 0'; msg.style.color = '#888';
            msg.textContent = `Showing top ${limit} notable transactions of ${viewableTxs.length}.`;
            blocksContainer.appendChild(msg);
        }

        if (viewableTxs.length === 0) {
            const msg = document.createElement('p');
            msg.style.padding = '15px 0'; msg.style.color = '#888';
            msg.textContent = `No transactions matched the current filter.`;
            blocksContainer.appendChild(msg);
        }

        table.addEventListener('click', (e) => {
            if (e.target.classList.contains('tx-id-link')) {
                const txid = e.target.getAttribute('data-txid');
                const tx = block.transactions.find(t => t.txid === txid);
                if (tx) showTxModal(tx);
            }
        });
    }

    function showTxModal(tx) {
        let byteBreakdownHtml = '';
        if (tx.size_stats) {
            const stats = tx.size_stats;
            if (stats.version_size !== undefined) {
                const total = stats.total_size;
                const verPct = total > 0 ? (stats.version_size / total * 100) : 0;
                const inPct = total > 0 ? (stats.inputs_size / total * 100) : 0;
                const outPct = total > 0 ? (stats.outputs_size / total * 100) : 0;
                const witPct = total > 0 ? (stats.witness_size / total * 100) : 0;
                const lockPct = total > 0 ? (stats.locktime_size / total * 100) : 0;

                byteBreakdownHtml = `
                    <div class="detail-row" style="margin-top:20px;">
                        <div class="detail-lbl">BYTE BREAKDOWN</div>
                    </div>
                    <div style="margin-bottom:20px; font-family: var(--font-mono);">
                        <div class="byte-bar tooltip-container" title="Version: ${stats.version_size} B | Inputs: ${stats.inputs_size} B | Outputs: ${stats.outputs_size} B | Witness: ${stats.witness_size} B | Locktime: ${stats.locktime_size} B">
                            <div class="byte-version" style="width: ${verPct}%;"></div>
                            <div class="byte-inputs" style="width: ${inPct}%;"></div>
                            <div class="byte-outputs" style="width: ${outPct}%;"></div>
                            <div class="byte-witness" style="width: ${witPct}%;"></div>
                            <div class="byte-locktime" style="width: ${lockPct}%;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size: 0.8em; margin-top: 5px;" class="muted">
                            <span><strong>Total:</strong> ${stats.total_size} B</span>
                            <span><strong>Weight:</strong> ${stats.weight} WU</span>
                            <span><strong>vBytes:</strong> ${stats.vbytes} vB</span>
                        </div>
                    </div>
                `;
            } else {
                const witnessSize = stats.total_size - stats.base_size;
                const basePct = stats.total_size > 0 ? (stats.base_size / stats.total_size * 100) : 0;
                const witPct = stats.total_size > 0 ? (witnessSize / stats.total_size * 100) : 0;

                byteBreakdownHtml = `
                    <div class="detail-row" style="margin-top:20px;">
                        <div class="detail-lbl">BYTE BREAKDOWN</div>
                    </div>
                    <div style="margin-bottom:20px; font-family: var(--font-mono);">
                        <div class="byte-bar tooltip-container" title="Base: ${stats.base_size} B | Witness: ${witnessSize} B">
                            <div class="byte-base" style="width: ${basePct}%;"></div>
                            <div class="byte-witness" style="width: ${witPct}%;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size: 0.8em; margin-top: 5px;" class="muted">
                            <span><strong>Total:</strong> ${stats.total_size} B</span>
                            <span><strong>Weight:</strong> ${stats.weight} WU</span>
                            <span><strong>vBytes:</strong> ${stats.vbytes} vB</span>
                        </div>
                    </div>
                `;
            }
        }

        let graphHtml = '';
        if (tx.inputs && tx.outputs && (tx.inputs.length > 0 || tx.outputs.length > 0)) {
            graphHtml = `
            <div class="detail-row" style="margin-top:20px;">
                <div class="detail-lbl">TRANSACTION GRAPH</div>
            </div>
            <div class="tx-graph-container">
                <div class="tx-graph-column tx-inputs-col">
                    <div class="tx-graph-header">Inputs (${tx.inputs.length})</div>
                    ${tx.inputs.slice(0, 50).map(i => `<div class="tx-node in-node" title="Value: ${i.value} sat"><span class="badge ${i.scriptType}">${i.scriptType}</span><div class="node-val">${formatSats(i.value)}</div></div>`).join('')}
                    ${tx.inputs.length > 50 ? `<div class="tx-node in-node"><span class="badge unknown">...and ${tx.inputs.length - 50} more</span></div>` : ''}
                </div>
                <div class="tx-graph-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </div>
                <div class="tx-graph-column tx-outputs-col">
                    <div class="tx-graph-header">Outputs (${tx.outputs.length})</div>
                    ${tx.outputs.slice(0, 50).map(o => `<div class="tx-node out-node" title="Value: ${o.value} sat"><span class="badge ${o.scriptType}">${o.scriptType}</span><div class="node-val">${formatSats(o.value)}</div></div>`).join('')}
                    ${tx.outputs.length > 50 ? `<div class="tx-node out-node"><span class="badge unknown">...and ${tx.outputs.length - 50} more</span></div>` : ''}
                </div>
            </div>
            `;
        }

        let detailsHtml = `
            <div class="detail-row">
                <div class="detail-lbl">TXID</div>
                <div class="detail-val">
                    <strong><a href="https://mempool.space/tx/${tx.txid}" target="_blank" style="color:var(--color-primary);">${tx.txid}</a></strong>
                    <span class="copyable-hash" data-hash="${tx.txid}" title="Click to copy TXID" style="margin-left: 10px;">
                        <span class="copy-badge">copy</span>
                    </span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-lbl">CLASSIFICATION</div>
                <div class="detail-val"><span class="badge ${tx.classification}">${tx.classification}</span></div>
            </div>
            <div class="detail-row">
                <div class="detail-lbl">TRANSACTION FEE</div>
                <div class="detail-val"><strong>${tx.isCoinbase ? '<span class="badge coinbase">Coinbase (New Coins)</span>' : (tx.fee !== undefined ? formatSats(tx.fee) : '<span class="muted">Data missing</span>')}</strong></div>
            </div>
            ${byteBreakdownHtml}
            ${graphHtml}
            <div class="detail-row" style="margin-top:20px;">
                <div class="detail-lbl">HEURISTICS FIRED</div>
            </div>
        `;

        let fired = false;
        for (const [hId, details] of Object.entries(tx.heuristics)) {
            if (details.detected) {
                fired = true;
                detailsHtml += `
                    <div class="h-box">
                        <strong>${hId}</strong>
                        <pre>${JSON.stringify(details, null, 2)}</pre>
                    </div>
                    `;
            }
        }
        if (!fired) detailsHtml += `<p class="muted">No heuristics triggered for this transaction.</p>`;

        modalBody.innerHTML = detailsHtml;
        txModal.style.display = 'flex';
    }

    function showEmptyState() {
        dbContent.style.display = 'none';
        loadingState.style.display = 'none';
        emptyState.style.display = 'flex';
    }

    function showLoadingState() {
        emptyState.style.display = 'none';
        dbContent.style.display = 'none';
        loadingState.style.display = 'flex';
    }

    function formatSats(sats) {
        if (sats === 0) return '0 sat (0 BTC)';
        const btc = (sats / 100000000).toFixed(8).replace(/\.?0+$/, "");
        return `${sats.toLocaleString()} sat (~${btc} BTC)`;
    }
});
