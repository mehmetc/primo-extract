import sourceMap from 'source-map'
import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import axios from 'axios'
import os from 'os'
import glob from 'glob'
import { html as beautifyHtml } from 'js-beautify'
import { js as beautifyJS } from 'js-beautify'

// const Parts = [
//     "account_chunk.js.map",
//     "almaViewer_chunk.js.map",
//     "angular.js.map",
//     "app.js.map",
//     "atoz_chunk.js.map",
//     "bootstrap_bundle.js.map",
//     "bundle.js.map",
//     "collectionDiscovery_chunk.js.map",
//     "favorites_chunk.js.map",
//     "fullView_chunk.js.map",
//     "vendor.js.map"
// ];


// const Parts = [
//     "account_chunk.js.map",
//     "almaViewer_chunk.js.map",
//     "angular.js.map",
//     "app.js.map",
//     "atoz_chunk.js.map",
//     "bootstrap_bundle.js.map",
//     "bundle.js.map",
//     "collectionDiscovery_chunk.js.map",
//     "favorites_chunk.js.map",
//     "fullView_chunk.js.map",
//     "vendor.js.map"];

// Primo February 2023 Release
const Parts = [
    "account_chunk_web_pack_generated.js.map",
    "almaViewer_chunk_web_pack_generated.js.map",
    "angular.js.map",
    "atoz_chunk_web_pack_generated.js.map",
    "bootstrap_bundle.js.map",
    "bundle.js.map",
    "collectionDiscovery_chunk_web_pack_generated.js.map",
    "favorites_chunk_web_pack_generated.js.map",
    "fullView_chunk_web_pack_generated.js.map"];

async function extract(uri, outDir) {
    outDir = path.resolve(outDir.replace(/^\~/, os.homedir()));
    const mapsDir = `${outDir}/tmp/maps`;

    const filepaths = await downloadMaps(mapsDir, uri);
    await dumpSource(filepaths, outDir);
    await copyFiles(outDir);
}

async function downloadMaps(mapsDir, uri) {
    mkdirp.sync(mapsDir);
    let filepaths = []

    await Promise.all(Parts.map(async (part) => {
        console.log(`Fetching part ${part}`);
        try {
            const file = await getMap(`${uri}/primo-explore/lib/${part}`);
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
    return axios.get(uri);
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
        mkdirp.sync(path.dirname(sourceWritePath));
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

            mkdirp.sync(path.dirname(sourceWritePath));
            fs.writeFileSync(sourceWritePath, beautifyHtml(d[k]));            
        });
    });
}

async function copyFiles(outDir) {
    glob(`${outDir}/tmp/**/webapp/components/**`, (er, files) => {
        files.forEach((f) => {
            try {
                let copyFile = `${outDir}${path.sep}source${path.sep}www${path.sep}components${f.split(`webapp${path.sep}components`).pop()}`.replace('/', path.sep);
                
                mkdirp.sync(path.dirname(copyFile));
                if (fs.existsSync(f) && fs.lstatSync(f).isFile()) {
                    fs.copyFileSync(f, copyFile);
                }
            } catch (e) {
                console.log(e.message);
            }
        })
    })
}

export default extract;
