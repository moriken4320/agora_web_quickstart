const path = require('path');
const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const VueLoaderPlugin = require('vue-loader/lib/plugin');

 module.exports = {
 entry: [
   __dirname + '/js/main.js',
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
 module: {
   rules: [
      {test: /\.vue$/, loader: "vue-loader"},
   ],
 },
 plugins: [
    new Dotenv({ systemvars: true }),
    new HtmlWebpackPlugin({
       template: path.resolve(__dirname, "index.html")
    }),
    new VueLoaderPlugin(),
  ],
  resolve: {
      alias: {
      'vue$': 'vue/dist/vue.esm.js',
      }
   },
 };