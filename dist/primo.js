"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _sourceMap = _interopRequireDefault(require("source-map"));
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _axios = _interopRequireDefault(require("axios"));
var _os = _interopRequireDefault(require("os"));
var _glob = require("glob");
var _jsBeautify = require("js-beautify");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// Primo February 2024 Release
const Parts = {
  discovery: ["bundle.js.map"],
  nde: []
};
async function getNDEMapFilenames(uri) {
  try {
    console.log('Determining NDE map filenames...');

    // Step 1: Fetch index.html to extract main.xxxx.js filename
    const indexUrl = `${uri}/nde/index.html`;
    console.log(`Fetching ${indexUrl}`);
    const indexResponse = await _axios.default.get(indexUrl);
    const indexHtml = indexResponse.data;

    // Extract main.xxxx.js from script tag
    // Looking for pattern like: <script src="main.4b1b4e99f9ea1359.js" ...>
    const mainJsMatch = indexHtml.match(/<script[^>]+src=["']([^"']*main\.[a-f0-9]+\.js)["']/i);
    if (!mainJsMatch) {
      throw new Error('Could not find main.xxxx.js in index.html');
    }
    const mainJsFilename = mainJsMatch[1];
    const mainJsMapFilename = `${mainJsFilename}.map`;
    console.log(`Found main.js: ${mainJsFilename}`);

    // Step 2: Fetch main.js to extract src_bootstrap_ts filename
    const mainJsUrl = `${uri}/nde/${mainJsFilename}`;
    console.log(`Fetching ${mainJsUrl} to find bootstrap file`);
    const mainJsResponse = await _axios.default.get(mainJsUrl);
    const mainJsContent = mainJsResponse.data;

    // Extract src_bootstrap_ts.xxxx.js from the main.js content
    // Looking for pattern like: src_bootstrap_ts:"b855a366f64a6056"
    const bootstrapMatch = mainJsContent.match(/src_bootstrap_ts:"([a-f0-9]+)"/);
    if (!bootstrapMatch) {
      throw new Error('Could not find src_bootstrap_ts.xxxx.js in main.js');
    }
    const bootstrapJsMapFilename = `src_bootstrap_ts.${bootstrapMatch[1]}.js.map`;
    console.log(`Found bootstrap file: src_bootstrap_ts.${bootstrapMatch[1]}.js`);
    return [mainJsMapFilename, bootstrapJsMapFilename];
  } catch (error) {
    console.error('Error determining NDE map filenames:', error.message);
    throw error;
  }
}
async function extract(uri, outDir, primoType = 'discovery') {
  outDir = _path.default.resolve(outDir.replace(/^\~/, _os.default.homedir()));
  const mapsDir = `${outDir}/tmp/maps`;
  const filepaths = await downloadMaps(mapsDir, uri, primoType);
  await dumpSource(filepaths, outDir);
  await copyFiles(outDir);
}
async function downloadMaps(mapsDir, uri, primoType = 'discovery') {
  console.log(mapsDir);
  _fs.default.mkdirSync(mapsDir, {
    recursive: true
  });
  let filepaths = [];
  console.log(`Primo type = ${primoType}`);

  // Get the parts list for this primoType
  let partsList;
  if (primoType === 'nde') {
    // Dynamically determine NDE map filenames
    partsList = await getNDEMapFilenames(uri);
  } else {
    // Use static parts list for discovery
    partsList = Parts[primoType] || Parts.discovery;
  }
  await Promise.all(partsList.map(async part => {
    console.log(`Fetching part ${part}`);
    try {
      const file = await getMap(`${uri}/${primoType}/${part}`);
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
  console.log(`loading ${uri}`);
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
    // Handle null or undefined source
    if (source === null || source === undefined) {
      source = "";
    }
    _fs.default.mkdirSync(_path.default.dirname(sourceWritePath), {
      recursive: true
    });
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
      _fs.default.mkdirSync(_path.default.dirname(sourceWritePath), {
        recursive: true
      });
      _fs.default.writeFileSync(sourceWritePath, (0, _jsBeautify.html)(d[k]));
    });
  });
}
async function copyFiles(outDir) {
  let filesMap = 'webapp';
  let tmpFiles = await (0, _glob.glob)(`${outDir}/tmp/**/${filesMap}/components/**`);
  if (tmpFiles.length == 0) {
    filesMap = 'app';
    tmpFiles = await (0, _glob.glob)(`${outDir}/tmp/**/${filesMap}/components/**`);
  }
  if (tmpFiles.length == 0) {
    throw "Couldn't find any files. Something probably changed.";
  }
  const files = tmpFiles;
  console.log(`\tCopying source files(${files.length})`);
  files.forEach(f => {
    try {
      let copyFile = `${outDir}${_path.default.sep}source${_path.default.sep}www${_path.default.sep}components${f.split(`${filesMap}${_path.default.sep}components`).pop()}`.replace("/", _path.default.sep);
      _fs.default.mkdirSync(_path.default.dirname(copyFile), {
        recursive: true
      });
      if (_fs.default.existsSync(f) && _fs.default.lstatSync(f).isFile()) {
        _fs.default.copyFileSync(f, copyFile);
      }
    } catch (e) {
      console.log(e.message);
    }
  });
}
var _default = exports.default = extract;