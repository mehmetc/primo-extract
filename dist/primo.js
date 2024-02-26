"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _sourceMap = _interopRequireDefault(require("source-map"));
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _mkdirp = _interopRequireDefault(require("mkdirp"));
var _axios = _interopRequireDefault(require("axios"));
var _os = _interopRequireDefault(require("os"));
var _glob = _interopRequireDefault(require("glob"));
var _jsBeautify = require("js-beautify");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
// Primo May 2023 Release
// const Parts = [
//     "app.js.map",
//     "vendor.js.map",
//     "account_chunk.js.map",
//     "almaViewer_chunk.js.map",
//     "fullView_chunk.js.map",
//     "favorites_chunk.js.map",
//     "collectionDiscovery_chunk.js.map",
//     "atoz_chunk.js.map",
//     "account_chunk_web_pack_generated.js.map",
//     "almaViewer_chunk_web_pack_generated.js.map",
//     "angular.js.map",
//     "atoz_chunk_web_pack_generated.js.map",
//     "bootstrap_bundle.js.map",
//     "bundle.js.map",
//     "collectionDiscovery_chunk_web_pack_generated.js.map",
//     "favorites_chunk_web_pack_generated.js.map",
//     "fullView_chunk_web_pack_generated.js.map"];

// Primo February 2024 Release
const Parts = ["bundle.js.map"];
async function extract(uri, outDir, primoType = 'discovery') {
  outDir = _path.default.resolve(outDir.replace(/^\~/, _os.default.homedir()));
  const mapsDir = `${outDir}/tmp/maps`;
  const filepaths = await downloadMaps(mapsDir, uri, primoType);
  await dumpSource(filepaths, outDir);
  await copyFiles(outDir);
}
async function downloadMaps(mapsDir, uri, primoType = 'discovery') {
  console.log(mapsDir);
  _mkdirp.default.sync(mapsDir);
  let filepaths = [];
  console.log(`Primo type = ${primoType}`);
  await Promise.all(Parts.map(async part => {
    console.log(`Fetching part ${part}`);
    try {
      const file = await getMap(`${uri}/${primoType}/lib/${part}`);
      if (file.status == 200) {
        const filename = _path.default.parse(file.request.path).base;
        const filepath = `${mapsDir}${_path.default.sep}${filename}`;
        filepaths.push(filepath);
        console.log(`Writing ${filename} to ${filepath}`);
        _fs.default.writeFileSync(filepath, JSON.stringify(file.data));
      }
    } catch (e) {
      console.log(`\tError (don't panic, yet) fetching part ${part}`);
    }
  }));
  return filepaths;
}
async function getMap(uri) {
  return _axios.default.get(uri, {
    validateStatus: () => true
  });
}
async function dumpSource(filepaths, outDir) {
  console.log('\tParsing maps');
  for (const filename of filepaths) {
    const subDir = _path.default.basename(filename, '.js.map');
    const map = await readMapFile(filename);
    await mapConsumerToSource(map, outDir, subDir);
  }
}
async function readMapFile(filename) {
  return new Promise((resolve, reject) => {
    _fs.default.readFile(filename, (err, data) => {
      if (err) {
        console.log(`\n\n\n${filename}\n\n\n`);
        reject(err);
      } else {
        let map = JSON.parse(data);
        resolve(map);
      }
    });
  });
}
async function writeSourceFile(sourceWritePath, source) {
  return new Promise((resolve, reject) => {
    _mkdirp.default.sync(_path.default.dirname(sourceWritePath));
    _fs.default.writeFile(sourceWritePath, source, err => {
      if (err) {
        console.log(`\n\n\n${_path.default.dirname(sourceWritePath)}\n\n\n`);
        reject(err);
      }
      ;
      resolve(true);
    });
  });
}
async function mapConsumerToSource(map, outDir, subDir) {
  let consumer = new _sourceMap.default.SourceMapConsumer(map);
  if (consumer) {
    try {
      const c = await consumer;
      for (const sourceFile of c.sources) {
        const source = c.sourceContentFor(sourceFile);
        const fileExt = _path.default.extname(sourceFile);
        let beautifiedSource = "";
        //console.log(sourceFile, fileExt);

        switch (fileExt) {
          case "ts":
            beautifiedSource = (0, _jsBeautify.js)(source);
            break;
          case "js":
            beautifiedSource = (0, _jsBeautify.js)(source);
            break;
          case "html":
            beautifiedSource = (0, _jsBeautify.html)(source);
            break;
          default:
            beautifiedSource = source;
        }
        const sourceWritePath = `${outDir}${_path.default.sep}tmp${_path.default.sep}source${_path.default.sep}${subDir}/${sourceFile.replace(/^webpack:\/+/, '')}`;
        await writeSourceFile(sourceWritePath, beautifiedSource);
        if (/templates.js/.test(sourceWritePath)) {
          dumpTemplates(sourceWritePath, outDir);
        }
      }
    } catch (e) {
      console.log(e);
    }
  } else {
    console.log('nothing to extract');
  }
}
function dumpTemplates(templatePath, outDir) {
  let $templateCache = {
    put: function (k, v) {
      let s = {};
      s[k] = v;
      t.push(s);
    }
  }; //$templateCache replacement

  /* Angular shim */
  let angular = {
    module: function (moduleName) {
      return {
        run: function (templateArray) {
          templateArray[1]($templateCache);
        }
      };
    }
  };
  global.angular = angular;
  global.$templateCache = $templateCache;
  global.t = [];
  require(templatePath);
  console.log(`\tFound ${t.length} templates`);
  console.log("\t\tExtracting Templates");
  t.forEach(function (d) {
    Object.keys(d).forEach(function (k) {
      let sourceWritePath = `${outDir}${_path.default.sep}source${_path.default.sep}html${_path.default.sep}${k}`;
      _mkdirp.default.sync(_path.default.dirname(sourceWritePath));
      _fs.default.writeFileSync(sourceWritePath, (0, _jsBeautify.html)(d[k]));
    });
  });
}
async function copyFiles(outDir) {
  const files = await (0, _glob.default)(`${outDir}/tmp/**/webapp/components/**`);
  console.log(`\tCopying source files(${files.length})`);
  files.forEach(f => {
    try {
      let copyFile = `${outDir}${_path.default.sep}source${_path.default.sep}www${_path.default.sep}components${f.split(`webapp${_path.default.sep}components`).pop()}`.replace("/", _path.default.sep);
      _mkdirp.default.sync(_path.default.dirname(copyFile));
      if (_fs.default.existsSync(f) && _fs.default.lstatSync(f).isFile()) {
        _fs.default.copyFileSync(f, copyFile);
      }
    } catch (e) {
      console.log(e.message);
    }
  });
}
var _default = exports.default = extract;