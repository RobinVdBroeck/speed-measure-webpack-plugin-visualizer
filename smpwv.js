const fs = require("fs/promises");
const path = require("path");
const program = require("commander");
const handlebars = require("handlebars");
const { v4: uuid } = require("uuid");

async function readAndParseInputFile(inputFile) {
  const content = await fs.readFile(inputFile);
  const {
    plugins,
    loaders: { build },
    misc,
  } = JSON.parse(content);

  const totalCompileTime = misc.compileTime / 1000;

  const sortedPlugins = Object.entries(plugins)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      name: key,
      time: value / 1000,
    }));

  const loaderView = build
    .map((loader) => ({
      id: uuid(),
      loaders: loader.loaders,
      time: loader.activeTime / 1000,
      amountOfFiles: loader.rawStartEnds.length,
      files: loader.rawStartEnds
        .map((o) => ({
          name: o.name,
          time: o.end - o.start,
        }))
        .sort((a, b) => b.time - a.time),
    }))
    .sort((a, b) => b.time - a.time);

  return {
    totalCompileTime,
    plugins: sortedPlugins,
    loaders: loaderView,
  };
}

async function compileTemplate() {
  const templateSrc = await fs.readFile(path.join(__dirname, "./template.hbs"));
  const template = handlebars.compile(templateSrc.toString());
  return template;
}

async function main() {
  program
    .version("0.1.0")
    .requiredOption("--input <filename> ", "input file")
    .option("--output <filename>", "output file", "results.html")
    .parse(process.argv);

  const options = program.opts();

  const [viewModel, template] = await Promise.all([
    readAndParseInputFile(options.input),
    compileTemplate(),
  ]);

  const rendered = template(viewModel);

  await fs.writeFile(options.output, rendered);
}

main().catch((error) => console.error(error));