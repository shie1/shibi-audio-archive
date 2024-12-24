const express = require("express");
const fs = require("fs");

const app = express();

//cors allow all
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

// if no build folder
if (!fs.existsSync("build")) {
    console.error("Please build the library first!");
    process.exit(1);
}

// take -p or --port arg
const portIndex = process.argv.indexOf('-p') !== -1 ? process.argv.indexOf('-p') : process.argv.indexOf('--port');
const port = portIndex !== -1 ? process.argv[portIndex + 1] : 3000;

// each folder has an index.json file make index.html redirect to index.json
app.get("*", (req, res) => {
    const path = req.path.slice(1).split("/");

    if (path[0] === "favicon.ico") {
        return res.status(404).send("Not found");
    }

    const artist = path[0];
    const release = path[1] || undefined;
    const file = path[2] || undefined;

    // check if artist dir exists
    if (artist && !fs.existsSync(`build/${artist}`)) {
        return res.status(404).send("Not found");
    }

    // if release is defined, check if release dir exists
    if (release && !fs.existsSync(`build/${artist}/${release}`)) {
        return res.status(404).send("Not found");
    }

    // if file is defined, check if file exists
    if (file && (!fs.existsSync(`build/${artist}/${release}/${file}`) && !fs.existsSync(`build/${artist}/${release}/${file}.m4a`))) {
        return res.status(404).send("Not found");
    }

    if (release && release.endsWith(".jpg")) {
        return res.sendFile(`build/${artist}/${release}`, { root: __dirname });
    }

    if (file) {
        // if jpg image
        if (file.endsWith(".jpg")) {
            return res.sendFile(`build/${artist}/${release}/${file}`, { root: __dirname });
        } else if (file.endsWith(".m4a")) {
            //stream aac file
            return res.sendFile(`build/${artist}/${release}/${file}`, { root: __dirname });
        } else if (
            !file.includes(".") && fs.existsSync(`build/${artist}/${release}/${file}.m4a`)
        ) {
            const releaseIndex = JSON.parse(fs.readFileSync(`build/${artist}/${release}/index.json`, 'utf8'));
            const trackIndex = releaseIndex.tracks.find(track => track.path === `${releaseIndex.directory}/${file}.m4a`);
            return res.json(trackIndex, null, 4);
        }
    }

    if (release) {
        // if release is defined, return release index
        return res.sendFile(`build/${artist}/${release}/index.json`, { root: __dirname });
    }

    // if release is not defined, return artist index
    return res.sendFile(`build/${artist}/index.json`, { root: __dirname });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});