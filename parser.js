const fs = require('fs');
const crypto = require('crypto');

class ByteStreamReader {
    constructor(buffer) {
        this.buffer = buffer;
        this.pos = 0;
    }
    readBytes(n) {
        const res = this.buffer.subarray(this.pos, this.pos + n);
        this.pos += n;
        return res;
    }
    readUInt32LE() {
        const val = this.buffer.readUInt32LE(this.pos);
        this.pos += 4;
        return val;
    }
    readBigUInt64LE() {
        const val = this.buffer.readBigUInt64LE(this.pos);
        this.pos += 8;
        return val;
    }
    readVarInt() {
        const first = this.buffer[this.pos++];
        if (first < 0xfd) return first;
        if (first === 0xfd) {
            const val = this.buffer.readUInt16LE(this.pos);
            this.pos += 2;
            return val;
        }
        if (first === 0xfe) {
            const val = this.buffer.readUInt32LE(this.pos);
            this.pos += 4;
            return val;
        }
        const val = this.buffer.readBigUInt64LE(this.pos);
        this.pos += 8;
        return Number(val);
    }
}

function xorDecode(filename, keyname) {
    const data = fs.readFileSync(filename);
    const key = fs.readFileSync(keyname);
    for (let i = 0; i < data.length; i++) {
        data[i] ^= key[i % key.length];
    }
    return data;
}

function classifyScript(scriptBytes) {
    if (scriptBytes.length === 22 && scriptBytes[0] === 0x00 && scriptBytes[1] === 0x14) return "p2wpkh";
    if (scriptBytes.length === 34 && scriptBytes[0] === 0x51 && scriptBytes[1] === 0x20) return "p2tr";
    if (scriptBytes.length === 23 && scriptBytes[0] === 0xa9 && scriptBytes[1] === 0x14 && scriptBytes[22] === 0x87) return "p2sh";
    if (scriptBytes.length === 25 && scriptBytes[0] === 0x76 && scriptBytes[1] === 0xa9 && scriptBytes[2] === 0x14 && scriptBytes[23] === 0x88 && scriptBytes[24] === 0xac) return "p2pkh";
    if (scriptBytes.length === 34 && scriptBytes[0] === 0x00 && scriptBytes[1] === 0x20) return "p2wsh";
    if (scriptBytes.length > 0 && scriptBytes[0] === 0x6a) return "op_return";
    if (scriptBytes.length === 35 && scriptBytes[0] === 0x21 && scriptBytes[34] === 0xac) return "p2pk";
    if (scriptBytes.length === 67 && scriptBytes[0] === 0x41 && scriptBytes[66] === 0xac) return "p2pk";
    return "unknown";
}

function writeVarInt(val) {
    if (val < 0xfd) return Buffer.from([val]);
    if (val <= 0xffff) { const b = Buffer.alloc(3); b[0] = 0xfd; b.writeUInt16LE(val, 1); return b; }
    if (val <= 0xffffffff) { const b = Buffer.alloc(5); b[0] = 0xfe; b.writeUInt32LE(val, 1); return b; }
    const b = Buffer.alloc(9); b[0] = 0xff; b.writeBigUInt64LE(BigInt(val), 1); return b;
}

function computeTxMeta(txDataBuffer, startPos, endPos, isSegwit, vins, vouts, version, locktime) {
    let baseSize = endPos - startPos;
    let txid = "";
    if (!isSegwit) {
        const bytes = txDataBuffer.subarray(startPos, endPos);
        const hash1 = crypto.createHash('sha256').update(bytes).digest();
        const hash2 = crypto.createHash('sha256').update(hash1).digest();
        txid = hash2.reverse().toString('hex');
    } else {
        const chunks = [];
        const buf32 = Buffer.alloc(4);
        buf32.writeUInt32LE(version, 0);
        chunks.push(buf32);
        chunks.push(writeVarInt(vins.length));
        for (let vin of vins) {
            chunks.push(Buffer.from(vin.txid, 'hex').reverse());
            const bout = Buffer.alloc(4); bout.writeUInt32LE(vin.vout, 0);
            chunks.push(bout);
            chunks.push(writeVarInt(vin.scriptSig.length));
            chunks.push(vin.scriptSig);
            const bseq = Buffer.alloc(4); bseq.writeUInt32LE(vin.sequence, 0);
            chunks.push(bseq);
        }
        chunks.push(writeVarInt(vouts.length));
        for (let vout of vouts) {
            const bval = Buffer.alloc(8); bval.writeBigUInt64LE(BigInt(vout.value), 0);
            chunks.push(bval);
            chunks.push(writeVarInt(vout.scriptPubKey.length));
            chunks.push(vout.scriptPubKey);
        }
        const block = Buffer.alloc(4); block.writeUInt32LE(locktime, 0);
        chunks.push(block);
        const baseTxBytes = Buffer.concat(chunks);
        baseSize = baseTxBytes.length;
        const hash1 = crypto.createHash('sha256').update(baseTxBytes).digest();
        const hash2 = crypto.createHash('sha256').update(hash1).digest();
        txid = hash2.reverse().toString('hex');
    }
    const totalSize = endPos - startPos;
    const weight = baseSize * 3 + totalSize;
    const vbytes = Math.ceil(weight / 4);
    return { txid, weight, vbytes, baseSize, totalSize };
}

function readTx(reader) {
    const startPos = reader.pos;
    const version = reader.readUInt32LE();
    const version_size = 4;

    let isSegwit = false;
    let flag = reader.buffer[reader.pos];
    let flag2 = reader.buffer[reader.pos + 1];
    let marker_flag_size = 0;
    if (flag === 0x00 && flag2 === 0x01) {
        isSegwit = true;
        reader.pos += 2;
        marker_flag_size = 2;
    }

    const posBeforeVins = reader.pos;
    const numVin = reader.readVarInt();
    const vins = [];
    let isCoinbase = false;
    for (let i = 0; i < numVin; i++) {
        const txid = reader.readBytes(32).reverse().toString('hex');
        const vout = reader.readUInt32LE();
        const scriptSigSize = reader.readVarInt();
        const scriptSig = reader.readBytes(scriptSigSize);
        const sequence = reader.readUInt32LE();
        if (txid === "0000000000000000000000000000000000000000000000000000000000000000") {
            isCoinbase = true;
        }
        vins.push({ txid, vout, sequence, scriptSig });
    }
    const inputs_size = reader.pos - posBeforeVins;

    const posBeforeVouts = reader.pos;
    const numVout = reader.readVarInt();
    const vouts = [];
    for (let i = 0; i < numVout; i++) {
        const value = Number(reader.readBigUInt64LE());
        const scriptPubKeySize = reader.readVarInt();
        const scriptPubKey = reader.readBytes(scriptPubKeySize);
        vouts.push({ value, scriptPubKey, scriptType: classifyScript(scriptPubKey) });
    }
    const outputs_size = reader.pos - posBeforeVouts;

    let witness_size = marker_flag_size;
    if (isSegwit) {
        const posBeforeWitness = reader.pos;
        for (let i = 0; i < numVin; i++) {
            const numWitness = reader.readVarInt();
            for (let j = 0; j < numWitness; j++) {
                const witSize = reader.readVarInt();
                reader.pos += witSize;
            }
        }
        witness_size += (reader.pos - posBeforeWitness);
    }
    const locktime = reader.readUInt32LE();
    const locktime_size = 4;
    const endPos = reader.pos;

    const meta = computeTxMeta(reader.buffer, startPos, endPos, isSegwit, vins, vouts, version, locktime);

    return {
        txid: meta.txid,
        isCoinbase,
        vins,
        vouts,
        weight: meta.weight,
        vbytes: meta.vbytes,
        baseSize: meta.baseSize,
        totalSize: meta.totalSize,
        version_size,
        inputs_size,
        outputs_size,
        witness_size,
        locktime_size
    };
}

function getBip34Height(scriptSig) {
    if (scriptSig.length > 0) {
        const len = scriptSig[0];
        if (len <= 7 && scriptSig.length >= 1 + len) {
            let height = 0;
            for (let i = 0; i < len; i++) {
                height += scriptSig[1 + i] * Math.pow(256, i);
            }
            return height;
        }
    }
    return 0;
}

// ---- Undo logic ----

function readB128VarInt(reader) {
    let n = 0n;
    while (true) {
        const ch = reader.buffer[reader.pos++];
        n = (n << 7n) | BigInt(ch & 0x7F);
        if (ch & 0x80) {
            n += 1n;
        } else {
            return Number(n);
        }
    }
}

function decompressAmount(x) {
    if (x === 0) return 0;
    x -= 1;
    const e = x % 10;
    x = Math.floor(x / 10);
    let n;
    if (e < 9) {
        const d = (x % 9) + 1;
        x = Math.floor(x / 9);
        n = x * 10 + d;
    } else {
        n = x * 10 + 9;
    }
    return n * (10 ** e);
}

function parseCompressedTxOut(reader) {
    const nCode = readB128VarInt(reader);
    const height = nCode >> 1;
    if (height > 0) readB128VarInt(reader); // consume version
    const value = decompressAmount(readB128VarInt(reader));
    const nSize = readB128VarInt(reader);
    let scriptType = "unknown";
    if (nSize === 0) {
        reader.pos += 20; scriptType = "p2pkh";
    } else if (nSize === 1) {
        reader.pos += 20; scriptType = "p2sh";
    } else if (nSize >= 2 && nSize <= 5) {
        reader.pos += 32; scriptType = "p2pk";
    } else {
        const rawLen = nSize - 6;
        const scriptBytes = reader.readBytes(rawLen);
        scriptType = classifyScript(scriptBytes);
    }
    return { value, scriptType };
}

function parseUndoRecord(reader) {
    const numTxsWithUndo = reader.readVarInt();
    const record = [];
    for (let i = 0; i < numTxsWithUndo; i++) {
        const numInputsForTx = reader.readVarInt();
        const txUndo = [];
        for (let j = 0; j < numInputsForTx; j++) {
            txUndo.push(parseCompressedTxOut(reader));
        }
        record.push(txUndo);
    }
    return record;
}

function parseBlocksWithUndo(blkFile, revFile, xorFile) {
    const decodedBlock = xorDecode(blkFile, xorFile);
    const decodedUndo = xorDecode(revFile, xorFile);

    // Parse complete undo map first to match blocks by fingerprint
    const undoReader = new ByteStreamReader(decodedUndo);
    const undoMap = new Map();
    while (undoReader.pos + 8 <= undoReader.buffer.length) {
        const magic = undoReader.readBytes(4);
        if (magic.equals(Buffer.alloc(4))) break; // zero padding
        const undoSize = undoReader.readUInt32LE();
        const recordReader = new ByteStreamReader(undoReader.readBytes(undoSize));
        const record = parseUndoRecord(recordReader);

        const fingerprint = record.map(txUndo => txUndo.length).join(',');
        if (!undoMap.has(fingerprint)) undoMap.set(fingerprint, []);
        undoMap.get(fingerprint).push(record);

        undoReader.pos += 32; // Skip checksum
    }

    const blockReader = new ByteStreamReader(decodedBlock);
    const blocks = [];
    while (blockReader.pos + 8 <= blockReader.buffer.length) {
        const magic = blockReader.readBytes(4);
        if (magic.equals(Buffer.alloc(4))) continue; // zero padding or end
        const blockSize = blockReader.readUInt32LE();
        const startPos = blockReader.pos;
        const header = blockReader.readBytes(80);
        const blockHash = crypto.createHash('sha256').update(
            crypto.createHash('sha256').update(header).digest()
        ).digest().reverse().toString('hex');

        const headerReader = new ByteStreamReader(header);
        headerReader.pos = 68;
        const timestamp = headerReader.readUInt32LE();

        const txCount = blockReader.readVarInt();
        const txs = [];
        for (let i = 0; i < txCount; i++) {
            txs.push(readTx(blockReader));
        }

        // Find matched undo
        const fingerprint = txs.slice(1).map(tx => tx.vins.length).join(',');
        let matchedRecord = null;
        if (undoMap.has(fingerprint) && undoMap.get(fingerprint).length > 0) {
            matchedRecord = undoMap.get(fingerprint).shift();
        } else if (txs.length > 1) {
            throw new Error(`Undo data missing for block ${blockHash}`);
        }

        // Assign prevouts backward
        if (matchedRecord) {
            for (let i = 1; i < txs.length; i++) { // Skip coinbase
                const txUndo = matchedRecord[i - 1];
                for (let j = 0; j < txs[i].vins.length; j++) {
                    txs[i].vins[j].prevout = txUndo[j];
                }
            }
        }

        const blockHeight = txs.length > 0 ? getBip34Height(txs[0].vins[0].scriptSig) : 0;

        blocks.push({ blockHash, blockHeight, txCount, txs, timestamp });

        // Seek to the end of block using chunk size reported (sometimes there is extra padding)
        blockReader.pos = startPos + blockSize;
    }

    return blocks;
}

module.exports = {
    parseBlocksWithUndo
};
