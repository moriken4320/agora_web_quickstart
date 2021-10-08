module.exports = templateData => {
    const { page } = templateData.htmlWebpackPlugin.options;
    return (
      require("./templates/header.ejs")(templateData) +
      require("./templates/" + page + ".ejs")(templateData) +
      require("./templates/footer.ejs")(templateData)
    );
  };
  