const { exec } = require('child_process');
const path = require('path');

describe('cli.js', () => {
    const cliPath = path.resolve(__dirname, '../cli.js');

    it('should fail with invalid arguments', (done) => {
        exec(`node ${cliPath}`, (error, stdout, stderr) => {
            expect(error).toBeTruthy();
            expect(error.code).toBe(1);

            const errObj = JSON.parse(stderr.trim());
            expect(errObj.ok).toBe(false);
            expect(errObj.error.code).toBe('INVALID_ARGS');
            done();
        });
    });

    it('should fail elegantly when files are not found', (done) => {
        // Run with dummy filenames that don't exist
        exec(`node ${cliPath} --block no_blk.dat no_rev.dat no_xor.dat`, (error, stdout, stderr) => {
            expect(error).toBeTruthy();
            expect(error.code).toBe(1);

            const errObj = JSON.parse(stderr.trim());
            expect(errObj.ok).toBe(false);
            expect(errObj.error.code).toBe('PARSING_ERROR');
            expect(errObj.error.message).toContain('ENOENT');
            done();
        });
    });
});
