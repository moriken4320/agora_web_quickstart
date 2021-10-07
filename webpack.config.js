const path = require('path');
const Dotenv = require('dotenv-webpack');

 module.exports = {
 entry: './basicLiveStreaming.js',
 output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, './dist'),
 },
 devServer: {
    compress: true,
    port: 9000,
    open: true,
 },
 plugins: [
    new Dotenv({ systemvars: true }),
  ],
 };