const crypto = require('crypto');
const {
    ByteStreamReader,
    classifyScript,
    decompressAmount,
    getBip34Height,
    writeVarInt,
    computeTxMeta,
    readB128VarInt
} = require('../parser');

describe('parser.js', () => {
    describe('ByteStreamReader', () => {
        let buffer;
        let reader;

        beforeEach(() => {
            buffer = Buffer.from([
                0x01, 0x02, 0x03, 0x04, // 4 bytes
                0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 8 bytes (1 as BigUInt64LE)
                0xFC, // VarInt < 0xFD
                0xFD, 0x12, 0x34, // VarInt == 0xFD
                0xFE, 0x12, 0x34, 0x56, 0x78, // VarInt == 0xFE
                0xFF, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88 // VarInt == 0xFF
            ]);
            reader = new ByteStreamReader(buffer);
        });

        it('should read bytes', () => {
            const bytes = reader.readBytes(4);
            expect(bytes).toEqual(Buffer.from([0x01, 0x02, 0x03, 0x04]));
            expect(reader.pos).toBe(4);
        });

        it('should read UInt32LE', () => {
            const val = reader.readUInt32LE();
            expect(val).toBe(0x04030201); // 0x01, 0x02, 0x03, 0x04 reversed
        });

        it('should read BigUInt64LE', () => {
            reader.pos = 4;
            const val = reader.readBigUInt64LE();
            expect(val).toBe(1n);
        });

        it('should read VarInt < 0xfd', () => {
            reader.pos = 12;
            expect(reader.readVarInt()).toBe(0xFC);
        });

        it('should read VarInt == 0xfd', () => {
            reader.pos = 13;
            expect(reader.readVarInt()).toBe(0x3412);
        });

        it('should read VarInt == 0xfe', () => {
            reader.pos = 16;
            expect(reader.readVarInt()).toBe(0x78563412);
        });

        it('should read VarInt == 0xff', () => {
            reader.pos = 21;
            // 0x8877665544332211
            const expected = Number(0x8877665544332211n);
            expect(reader.readVarInt()).toBe(expected);
        });
    });

    describe('classifyScript', () => {
        it('should classify p2wpkh', () => {
            const script = Buffer.alloc(22);
            script[0] = 0x00; script[1] = 0x14;
            expect(classifyScript(script)).toBe('p2wpkh');
        });

        it('should classify p2tr', () => {
            const script = Buffer.alloc(34);
            script[0] = 0x51; script[1] = 0x20;
            expect(classifyScript(script)).toBe('p2tr');
        });

        it('should classify p2sh', () => {
            const script = Buffer.alloc(23);
            script[0] = 0xa9; script[1] = 0x14; script[22] = 0x87;
            expect(classifyScript(script)).toBe('p2sh');
        });

        it('should classify p2pkh', () => {
            const script = Buffer.alloc(25);
            script[0] = 0x76; script[1] = 0xa9; script[2] = 0x14; script[23] = 0x88; script[24] = 0xac;
            expect(classifyScript(script)).toBe('p2pkh');
        });

        it('should classify p2wsh', () => {
            const script = Buffer.alloc(34);
            script[0] = 0x00; script[1] = 0x20;
            expect(classifyScript(script)).toBe('p2wsh');
        });

        it('should classify op_return', () => {
            const script = Buffer.from([0x6a, 0x01, 0x02]);
            expect(classifyScript(script)).toBe('op_return');
        });

        it('should classify unknown', () => {
            const script = Buffer.from([0x01, 0x02, 0x03]);
            expect(classifyScript(script)).toBe('unknown');
        });
    });

    describe('decompressAmount', () => {
        it('should decompress amount 0', () => {
            expect(decompressAmount(0)).toBe(0);
        });

        it('should decompress simple amounts', () => {
            // Let x = 1. x-1=0. e=0, x=0. d = 1. n = 1.
            expect(decompressAmount(1)).toBe(1);

            // Let amount be 32. decompressAmount is reverse of compressAmount
            // Actually let's just test specific expected compressions based on the logic
            // decompressAmount(x)
            // x -= 1
            // e = x % 10
            // x = floor(x/10)
            // if e < 9: d = (x % 9) + 1; x /= 9; n = x * 10 + d
            // else: n = x * 10 + 9
            // n * 10^e

            // For x = 11:
            // x-1 = 10
            // e = 0, x = 1
            // d = (1%9)+1 = 2
            // x = 0
            // n = 0*10 + 2 = 2
            // n * 10^0 = 2
            expect(decompressAmount(11)).toBe(2);

            // For e = 9 (amount ends in 9):
            // x = 10:
            // x-1 = 9
            // e = 9, x = 0
            // n = 0*10 + 9 = 9
            // n * 10^9 = 9000000000
            expect(decompressAmount(10)).toBe(9000000000);
        });
    });

    describe('getBip34Height', () => {
        it('should return 0 for empty scriptSig', () => {
            expect(getBip34Height(Buffer.alloc(0))).toBe(0);
        });

        it('should extract height from scriptSig', () => {
            // length 3, bytes: 0x03, 0x11, 0x22, 0x33
            const scriptSig = Buffer.from([0x03, 0x11, 0x22, 0x33]);
            // height = 0x11 + 0x22 * 256 + 0x33 * 65536 = 17 + 8704 + 3342336 = 3351057
            expect(getBip34Height(scriptSig)).toBe(3351057);
        });

        it('should return 0 if scriptSig is too short', () => {
            const scriptSig = Buffer.from([0x03, 0x11]);
            expect(getBip34Height(scriptSig)).toBe(0);
        });
    });

    describe('writeVarInt', () => {
        it('should write VarInt < 0xfd', () => {
            const buf = writeVarInt(0xfc);
            expect(buf).toEqual(Buffer.from([0xfc]));
        });

        it('should write VarInt <= 0xffff', () => {
            const buf = writeVarInt(0xfd);
            expect(buf.length).toBe(3);
            expect(buf[0]).toBe(0xfd);
            expect(buf.readUInt16LE(1)).toBe(0xfd);
        });

        it('should write VarInt <= 0xffffffff', () => {
            const buf = writeVarInt(0x10000);
            expect(buf.length).toBe(5);
            expect(buf[0]).toBe(0xfe);
            expect(buf.readUInt32LE(1)).toBe(0x10000);
        });

        it('should write VarInt > 0xffffffff', () => {
            const buf = writeVarInt(0x100000000);
            expect(buf.length).toBe(9);
            expect(buf[0]).toBe(0xff);
            expect(buf.readBigUInt64LE(1)).toBe(0x100000000n);
        });
    });

    describe('computeTxMeta', () => {
        it('should compute legacy tx meta', () => {
            const txDataBuffer = Buffer.from('testtxdatathatshouldbehasshded123456');
            const meta = computeTxMeta(txDataBuffer, 0, txDataBuffer.length, false, [], [], 1, 0);

            // Expected hash:
            const hash1 = crypto.createHash('sha256').update(txDataBuffer).digest();
            const hash2 = crypto.createHash('sha256').update(hash1).digest();
            const expectedTxid = hash2.reverse().toString('hex');

            expect(meta.txid).toBe(expectedTxid);
            expect(meta.baseSize).toBe(txDataBuffer.length);
            expect(meta.totalSize).toBe(txDataBuffer.length);
            expect(meta.weight).toBe(txDataBuffer.length * 4);
            expect(meta.vbytes).toBe(txDataBuffer.length);
        });

        it('should compute segwit tx meta', () => {
            const vins = [{
                txid: '0000000000000000000000000000000000000000000000000000000000000000',
                vout: 0,
                scriptSig: Buffer.alloc(0),
                sequence: 0xFFFFFFFF
            }];
            const vouts = [{
                value: 5000000000,
                scriptPubKey: Buffer.alloc(22)
            }];

            const meta = computeTxMeta(Buffer.alloc(0), 0, 100, true, vins, vouts, 1, 0);
            expect(meta.totalSize).toBe(100);
            expect(meta.baseSize).toBeGreaterThan(0);
            expect(meta.weight).toBe(meta.baseSize * 3 + 100);
            expect(meta.vbytes).toBe(Math.ceil(meta.weight / 4));
            expect(meta.txid.length).toBe(64);
        });
    });

    describe('readB128VarInt', () => {
        it('should read variable length integer', () => {
            // Last byte doesn't have 0x80 MSB set
            const buf = Buffer.from([0x81, 0x02]);
            const reader = new ByteStreamReader(buf);

            // n = (0 << 7) | 1 = 1
            // n += 1 => n = 2
            // n = (2 << 7) | 2 = 256 + 2 = 258
            // 258 output
            const val = readB128VarInt(reader);
            expect(val).toBe(258);
        });
    });
});
