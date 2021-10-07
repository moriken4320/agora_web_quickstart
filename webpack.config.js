const path = require('path');
const Dotenv = require('dotenv-webpack');

 module.exports = {
 entry: [
   __dirname + '/js/main.js',
   __dirname + '/js/agora.js',
 ],
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