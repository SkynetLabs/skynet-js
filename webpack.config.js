const path = require("path");
const { merge } = require("webpack-merge");

module.exports = {
  entry: "./src/index.web.ts",
  target: "web",
  mode: "production",

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|bower_components)/,
        loader: "babel-loader",
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
    path: path.resolve(__dirname, "./dist/bundle"),
    // The filename needs to match the index.web.d.ts declarations file.
    filename: "index.js",
    library: "skynet",
    libraryTarget: "umd",
  },
};
