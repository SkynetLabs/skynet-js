const path = require('path');
const { merge } = require('webpack-merge');

var baseConfig = {
  mode: "production",

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        options: {
          ignore: ["src/**/*.test.ts"],
        },
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: "skynet",
    libraryTarget: "umd",
  },
};

let targets = ['web', 'node'].map((target) => {
  let base = merge(baseConfig, {
    entry: './src/index.'+target+'.ts',
    target: target,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: "ts-loader",
          exclude: /node_modules/,
          options: {
            configFile: "tsconfig.build.json",
            compilerOptions: {
              outDir: path.resolve(__dirname, './dist/' + target),
            },
          },
        },
      ],
    },
    output: {
      path: path.resolve(__dirname, './dist/' + target),
      filename: 'index.js'
    }
  });
  return base;
});

module.exports = targets;
