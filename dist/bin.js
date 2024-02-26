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
  console.log("usage: primoExtract --primo=https://your.primo.instance --outDir=/directory/to/exported/source --ve=false\n\n");
}
console.log(`\nPrimo Extract NUI source code.\nversion ${_package.version}. Optimized for PrimoVE. Use version <0.14 for Primo Classic\n\tWhen code is the manual ...\n\nKULeuven/LIBIS (c)2024\n\n`);
var argv = (0, _minimist.default)(process.argv.slice(2), {
  string: 'primo',
  boolean: 've',
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
  if (argv.ve == false) {
    (0, _primo.default)(primoUri, outDir, 'primo-explore');
  } else {
    (0, _primo.default)(primoUri, outDir, 'discovery');
  }
} else {
  usage();
}