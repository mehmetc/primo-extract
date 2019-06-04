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

const Parts = ["account_chunk.js.map", "almaViewer_chunk.js.map", "angular.js.map", "app.js.map", "atoz_chunk.js.map", "bootstrap_bundle.js.map", "bundle.js.map", "collectionDiscovery_chunk.js.map", "favorites_chunk.js.map", "fullView_chunk.js.map", "vendor.js.map"];

async function extract(uri, outDir) {
  outDir = _path.default.resolve(outDir.replace(/^\~/, _os.default.homedir()));
  const mapsDir = `${outDir}/tmp/maps`;
  const filepaths = await downloadMaps(mapsDir, uri);
  await dumpSource(filepaths, outDir);
  await copyFiles(outDir);
}

async function downloadMaps(mapsDir, uri) {
  _mkdirp.default.sync(mapsDir);

  let filepaths = [];
  await Promise.all(Parts.map(async part => {
    console.log(`Fetching part ${part}`);
    const file = await getMap(`${uri}/primo-explore/lib/${part}`);

    if (file.status == 200) {
      const filename = _path.default.parse(file.request.path).base;

      const filepath = `${mapsDir}/${filename}`;
      filepaths.push(filepath);
      console.log(`Writing ${filename} to ${filepath}`);

      _fs.default.writeFileSync(filepath, JSON.stringify(file.data));
    }
  }));
  return filepaths;
}

async function getMap(uri) {
  return _axios.default.get(uri);
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
        const sourceWritePath = `${outDir}/tmp/source/${subDir}/${sourceFile.replace(/^webpack:\/+/, '')}`;
        await writeSourceFile(sourceWritePath, source);

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
      let sourceWritePath = `${outDir}/source/html/${k}`;
      (0, _mkdirp.default)(_path.default.dirname(sourceWritePath), function (err) {
        _fs.default.writeFileSync(sourceWritePath, (0, _jsBeautify.html)(d[k]));
      });
    });
  });
}

async function copyFiles(outDir) {
  (0, _glob.default)(`${outDir}/tmp/**/webapp/components/**`, (er, files) => {
    files.forEach(f => {
      try {
        let copyFile = `${outDir}/source/www/components${f.split(`webapp${_path.default.sep}components`).pop()}`.replace('/', _path.default.sep);

        _mkdirp.default.sync(_path.default.dirname(copyFile));

        _fs.default.copyFileSync(f, copyFile);
      } catch (e) {
        console.log(e);
      }
    });
  });
}

var _default = extract;
exports.default = _default;