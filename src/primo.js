import sourceMap from 'source-map'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import os from 'os'
import { glob } from 'glob'
import { html as beautifyHtml } from 'js-beautify'
import { js as beautifyJS } from 'js-beautify'


// Primo February 2024 Release
const Parts = {
  discovery: ["bundle.js.map"],
  nde: [],
};

async function getNDEMapFilenames(uri) {
    try {
        console.log('Determining NDE map filenames...');

        // Step 1: Fetch index.html to extract main.xxxx.js filename
        const indexUrl = `${uri}/nde/index.html`;
        console.log(`Fetching ${indexUrl}`);
        const indexResponse = await axios.get(indexUrl);
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
        const mainJsResponse = await axios.get(mainJsUrl);
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

async function extract(uri, outDir, primoType = 'discovery' ) {
    outDir = path.resolve(outDir.replace(/^\~/, os.homedir()));
    const mapsDir = `${outDir}/tmp/maps`;

    const filepaths = await downloadMaps(mapsDir, uri, primoType);
    await dumpSource(filepaths, outDir);
    await copyFiles(outDir);
}

async function downloadMaps(mapsDir, uri, primoType = 'discovery') {
    console.log(mapsDir);
    fs.mkdirSync(mapsDir, { recursive: true });
    let filepaths = []

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

    await Promise.all(partsList.map(async (part) => {
        console.log(`Fetching part ${part}`);
        try {            
            const file = await getMap(`${uri}/${primoType}/${part}`);
            if (file.status == 200) {
                const filename = path.parse(file.request.path).base;
                const filepath = `${mapsDir}${path.sep}${filename}`;
                filepaths.push(filepath);
                console.log(`Writing ${filename} to ${filepath}`);
                fs.writeFileSync(filepath, JSON.stringify(file.data));

            }
        } catch (e) {
            console.log(`\tError (don't panic, yet) fetching part ${part}`);
        }
    }));
    return filepaths;
}

async function getMap(uri) {
    console.log(`loading ${uri}`);
    return axios.get(uri, {
        validateStatus: () => true,
    });
}


async function dumpSource(filepaths, outDir) {
    console.log('\tParsing maps');

    for (const filename of filepaths) {
        const subDir = path.basename(filename, '.js.map');
        const map = await readMapFile(filename)
        await mapConsumerToSource(map, outDir, subDir);
    }
}

async function readMapFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) {
                console.log(`\n\n\n${filename}\n\n\n`);
                reject(err);
            } else {
                let map = JSON.parse(data);
                resolve(map);
            }
        })
    });
}

async function writeSourceFile(sourceWritePath, source) {
    return new Promise((resolve, reject) => {
        // Handle null or undefined source
        if (source === null || source === undefined) {
            source = "";
        }

        fs.mkdirSync(path.dirname(sourceWritePath), { recursive: true });
        fs.writeFile(sourceWritePath, source, (err) => {
            if (err) {
                console.log(`\n\n\n${path.dirname(sourceWritePath)}\n\n\n`);
                reject(err)
            };
            resolve(true)
        });
    })
}

async function mapConsumerToSource(map, outDir, subDir) {
    let consumer = new sourceMap.SourceMapConsumer(map);
    if (consumer) {
        try {
            const c = await consumer;
            for (const sourceFile of c.sources) {
                const source = c.sourceContentFor(sourceFile);
                const fileExt = path.extname(sourceFile);
                let beautifiedSource = "";
                //console.log(sourceFile, fileExt);

                switch (fileExt) {
                    case "ts":
                        beautifiedSource = beautifyJS(source)
                        break;
                    case "js":
                        beautifiedSource = beautifyJS(source)
                        break;
                    case "html":
                        beautifiedSource = beautifyHtml(source)
                        break;
                    default:
                        beautifiedSource = source;
                }


                const sourceWritePath = `${outDir}${path.sep}tmp${path.sep}source${path.sep}${subDir}/${sourceFile.replace(/^webpack:\/+/, '')}`;
                await writeSourceFile(sourceWritePath, beautifiedSource);
                if (/templates.js/.test(sourceWritePath)) {
                    dumpTemplates(sourceWritePath, outDir);
                }
            }
        } catch (e) {
            console.log(e)
        }
    } else {
        console.log('nothing to extract');
    }
}

function dumpTemplates(templatePath, outDir) {
    let $templateCache = {
        put: function (k, v) {
            let s = {}
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
            }
        }
    }

    global.angular = angular;
    global.$templateCache = $templateCache;
    global.t = [];

    require(templatePath);
    console.log(`\tFound ${t.length} templates`);
    console.log("\t\tExtracting Templates");
    t.forEach(function (d) {
        Object.keys(d).forEach(function (k) {
            let sourceWritePath = `${outDir}${path.sep}source${path.sep}html${path.sep}${k}`;

            fs.mkdirSync(path.dirname(sourceWritePath), { recursive: true });
            fs.writeFileSync(sourceWritePath, beautifyHtml(d[k]));
        });
    });
}

async function copyFiles(outDir) {
    let filesMap = 'webapp';
    let tmpFiles = await glob(`${outDir}/tmp/**/${filesMap}/components/**`);
    
    if (tmpFiles.length == 0) {
        filesMap = 'app';
        tmpFiles = await glob(`${outDir}/tmp/**/${filesMap}/components/**`);
    }
    if (tmpFiles.length == 0){
        throw "Couldn't find any files. Something probably changed."
    }
    
    const files = tmpFiles;

    console.log(`\tCopying source files(${files.length})`);
    files.forEach((f) => {
      try {
        let copyFile = `${outDir}${path.sep}source${path.sep}www${
          path.sep
        }components${f.split(`${filesMap}${path.sep}components`).pop()}`.replace(
          "/",
          path.sep
        );

        fs.mkdirSync(path.dirname(copyFile), { recursive: true });
        if (fs.existsSync(f) && fs.lstatSync(f).isFile()) {
          fs.copyFileSync(f, copyFile);
        }
      } catch (e) {
        console.log(e.message);
      }
    });
  }

export default extract;
