const path = require('path');
const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const VueLoaderPlugin = require('vue-loader/lib/plugin');

 const app = {
 entry: [
   __dirname + '/src/js/main.js',
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
      { 
         test: /\.ejs$/, 
         loader: 'ejs-loader',
         options: {
            esModule: false,
          }
       },
      { test: /\.vue$/, loader: "vue-loader" },
   ],
 },
 plugins: [
    new Dotenv({ systemvars: true }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "./src/views/layout.js"),
      page: 'index',
      filename: 'index.html',
      title: 'Agora-Test',
      inject: "body",
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "./src/views/layout.js"),
      page: 'host',
      filename: 'host.html',
      title: 'Agora-Host',
      inject: "body",
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "./src/views/layout.js"),
      page: 'audience',
      filename: 'audience.html',
      title: 'Agora-Audience',
      inject: "body",
    }),
    new VueLoaderPlugin(),
  ],
  resolve: {
      alias: {
         'vue$': 'vue/dist/vue.esm.js',
      }
   },
 };

 module.exports = app