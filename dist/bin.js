"use strict";

var _package = require("../package.json");
var _minimist = _interopRequireDefault(require("minimist"));
var _primo = _interopRequireDefault(require("./primo"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * Primo Extract
 * 
 * Extract source code and templates from NUI
 * 
 * KULeuven/LIBIS
 * Mehmet Celik (c) 2018
 */

"use strict";
function usage() {
  console.log("usage: primoExtract --primo=https://your.primo.instance --outDir=/directory/to/exported/source\n\n");
}
console.log(`\nPrimo Extract NUI source code.\nversion ${_package.version}\n\tWhen code is the manual ...\n\nKULeuven/LIBIS (c)2023\n\n`);
var argv = (0, _minimist.default)(process.argv.slice(2), {
  string: 'primo',
  boolean: ['help'],
  alias: {
    h: 'help'
  }
});
if (argv.h || argv.help) {
  usage();
  process.exit(1);
}
if (Object.keys(argv).includes("primo")) {
  let primoUri = argv.primo;
  let outDir = Object.keys(argv).includes('outDir') ? argv.outDir : process.cwd();
  (0, _primo.default)(primoUri, outDir);
} else {
  usage();
}