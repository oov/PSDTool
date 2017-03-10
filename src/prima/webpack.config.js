module.exports = {
    entry: './src/main.ts',
    output: {
        filename: './js/index.js',
    },
    resolve: {
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js']
    },
    module: {
        loaders: [{
                test: /\.tsx?$/,
                loader: 'ts-loader'
            },
            {
                test: /\.txt$/,
                loader: 'raw-loader'
            },
        ]
    }
};