const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: './index.ts',
  mode: process.env.NODE_ENV,
  devtool: process.env.NODE_ENV === 'production' ? false : 'inline-source-map',
  plugins: [
    new Dotenv()
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  target: 'web',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, '../haganrealty/public/interact'),
  },
};