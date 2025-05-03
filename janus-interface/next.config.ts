import type { NextConfig } from "next";
const webpack = require('webpack');

const nextConfig: NextConfig = {
  webpack(config) {
    config.plugins.push(
      new webpack.ProvidePlugin({ adapter: ['webrtc-adapter', 'default'] })
    )
    // config.output = {
    //   ...config.output,
    //   globalObject: "this",
    // }
    // config.module.rules.push({
    //   test: require.resolve('janus-gateway'),
    //   loader: 'exports-loader',
    //   options: {
    //     exports: 'Janus',
    //   }
    // })
    return config;
  }
  // https://stackoverflow.com/questions/67478532/module-not-found-cant-resolve-fs-nextjs/67478653#67478653
  // future: {
  //   webpack5: true, // by default, if you customize webpack config, they switch back to version 4.
  //     // Looks like backward compatibility approach.
  // },
  // webpack(config) {
  //   config.resolve.fallback = {
  //     ...config.resolve.fallback, // if you miss it, all the other options in fallback, specified
  //       // by next.js will be dropped. Doesn't make much sense, but how it is
  //     fs: false, // the solution
  //   };

  //   return config;
  // },
  // // https://github.com/vercel/next.js/issues/7755
  // webpack: (config, { isServer }) => {
  //   // Fixes npm packages that depend on `fs` module
  //   if (!isServer) {
  //     config.node = {
  //       fs: 'empty'
  //     }
  //   }
  //   return config
  // }
};

export default nextConfig;
