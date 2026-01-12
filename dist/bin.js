"use strict";

var _package = require("../package.json");
var _minimist = _interopRequireDefault(require("minimist"));
var _primo = _interopRequireDefault(require("./primo"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
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
  console.log("usage: primoExtract --primo=https://your.primo.instance --outDir=/directory/to/exported/source --nde\n\n");
}
console.log(`\nPrimo Extract NUI source code.\nversion ${_package.version}. Use version <0.14 for Primo Classic, Use version <0.19 for PrimoVE and >=0.19 for NDE.\n\tWhen code is the manual ...\n\nKULeuven/LIBIS (c)2026\n\n`);
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
  let primoType = Object.keys(argv).includes('nde') ? 'nde' : 'discovery';
  (0, _primo.default)(primoUri, outDir, primoType);
} else {
  usage();
}