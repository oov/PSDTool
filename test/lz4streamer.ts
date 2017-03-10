import LZ4Streamer from '../src/lz4streamer';

describe('primar', function () {
    it('should equal', () => {
        new LZ4Streamer(1024 * 1024);
    });
});