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
    new webpack.ProvidePlugin({ adapter: ['webrtc-adapter', 'default'] }),
    new webpack.EnvironmentPlugin({
      "ICE_URL": null,
      "ICE_USERNAME": null,
      "ICE_PASSWORD": null,
      "JANUS_HOST": null,
    }),
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
    port: process.env.PORT,
    devMiddleware: {
      writeToDisk: true,
    },
    server: process.env.HTTPS ? "https" : "http",
  },
  watchOptions: {
    ignored: [path.posix.resolve(__dirname, './node_modules')],
  }
};
