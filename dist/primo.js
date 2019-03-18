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

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const Parts = ["app.js.map", "bundle.js.map", "account_chunk.js.map", "angular.js.map", "atoz_chunk.js.map", "bootstrap_bundle.js.map", "collectionDiscovery_chunk.js.map", "favorites_chunk.js.map", "fullView_chunk.js.map", "vendor.js.map"];

function extract(_x, _x2) {
  return _extract.apply(this, arguments);
}

function _extract() {
  _extract = _asyncToGenerator(function* (uri, outDir) {
    outDir = _path.default.resolve(outDir.replace(/^\~/, _os.default.homedir()));
    const mapsDir = `${outDir}/tmp/maps`;
    const filepaths = yield downloadMaps(mapsDir, uri);
    yield dumpSource(filepaths, outDir);
    yield copyFiles(outDir);
  });
  return _extract.apply(this, arguments);
}

function downloadMaps(_x3, _x4) {
  return _downloadMaps.apply(this, arguments);
}

function _downloadMaps() {
  _downloadMaps = _asyncToGenerator(function* (mapsDir, uri) {
    _mkdirp.default.sync(mapsDir);

    let filepaths = [];
    yield Promise.all(Parts.map(
    /*#__PURE__*/
    function () {
      var _ref = _asyncToGenerator(function* (part) {
        console.log(`Fetching part ${part}`);
        const file = yield getMap(`${uri}/primo-explore/lib/${part}`);

        if (file.status == 200) {
          const filename = file.request.path.split('/').pop();
          const filepath = `${mapsDir}/${filename}`;
          filepaths.push(filepath);
          console.log(`Writing ${filename} to ${filepath}`);

          _fs.default.writeFileSync(filepath, JSON.stringify(file.data));
        }
      });

      return function (_x15) {
        return _ref.apply(this, arguments);
      };
    }()));
    return filepaths;
  });
  return _downloadMaps.apply(this, arguments);
}

function getMap(_x5) {
  return _getMap.apply(this, arguments);
}

function _getMap() {
  _getMap = _asyncToGenerator(function* (uri) {
    return _axios.default.get(uri);
  });
  return _getMap.apply(this, arguments);
}

function dumpSource(_x6, _x7) {
  return _dumpSource.apply(this, arguments);
}

function _dumpSource() {
  _dumpSource = _asyncToGenerator(function* (filepaths, outDir) {
    console.log('\tParsing maps');

    for (const filename of filepaths) {
      const subDir = _path.default.basename(filename, '.js.map');

      const map = yield readMapFile(filename);
      yield mapConsumerToSource(map, outDir, subDir);
    }
  });
  return _dumpSource.apply(this, arguments);
}

function readMapFile(_x8) {
  return _readMapFile.apply(this, arguments);
}

function _readMapFile() {
  _readMapFile = _asyncToGenerator(function* (filename) {
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
  });
  return _readMapFile.apply(this, arguments);
}

function writeSourceFile(_x9, _x10) {
  return _writeSourceFile.apply(this, arguments);
}

function _writeSourceFile() {
  _writeSourceFile = _asyncToGenerator(function* (sourceWritePath, source) {
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
  });
  return _writeSourceFile.apply(this, arguments);
}

function mapConsumerToSource(_x11, _x12, _x13) {
  return _mapConsumerToSource.apply(this, arguments);
}

function _mapConsumerToSource() {
  _mapConsumerToSource = _asyncToGenerator(function* (map, outDir, subDir) {
    let consumer = new _sourceMap.default.SourceMapConsumer(map);

    if (consumer) {
      try {
        const c = yield consumer;

        for (const sourceFile of c.sources) {
          const source = c.sourceContentFor(sourceFile);
          const sourceWritePath = `${outDir}/tmp/source/${subDir}/${sourceFile.replace(/^webpack:\/+/, '')}`;
          yield writeSourceFile(sourceWritePath, source);

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
  });
  return _mapConsumerToSource.apply(this, arguments);
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

function copyFiles(_x14) {
  return _copyFiles.apply(this, arguments);
}

function _copyFiles() {
  _copyFiles = _asyncToGenerator(function* (outDir) {
    (0, _glob.default)(`${outDir}/tmp/**/webapp/components/**`, (er, files) => {
      files.forEach(f => {
        let copyFile = `${outDir}/source/www/components${f.split('webapp/components').pop()}`;

        _mkdirp.default.sync(_path.default.dirname(copyFile));

        _fs.default.copyFileSync(f, copyFile);
      });
    });
  });
  return _copyFiles.apply(this, arguments);
}

var _default = extract;
exports.default = _default;