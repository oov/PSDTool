module.exports = {
    entry: './src/lz4.ts',
    output: {
        filename: './lz4.js',
        library: "LZ4",
        libraryTarget: "umd"
    },
    resolve: {
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js']
    },
    module: {
        loaders: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader'
            }
        ]
    }
};
