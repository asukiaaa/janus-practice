const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'bundle.js',
    publicPath: path.resolve(__dirname, 'dist'),
  },
  mode: 'development',
  plugins: [
    new webpack.ProvidePlugin({ adapter: ['webrtc-adapter', 'default'] })
  ],
  module: {
    rules: [
      {
        test: require.resolve('janus-gateway'),
        loader: 'exports-loader',
        options: {
          exports: 'Janus',
        },
      }
    ]
  },
  devServer: {
    allowedHosts: "all",
    static: ".",
    compress: true,
    port: 3001,
    devMiddleware: {
      writeToDisk: true,
    }
  },
  watchOptions: {
    ignored: [path.posix.resolve(__dirname, './node_modules')],
  }
};
