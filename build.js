const fs = require('fs');
const musicMetadata = require('music-metadata');
const FFMpeg = require("fluent-ffmpeg");

// take arg "--test", if present
const test = process.argv.includes('--test');

if (!test) {
    // check if build dir exists
    if (!fs.existsSync('build')) {
        fs.mkdirSync('build');
    } else {
        // clear build dir recursively
        fs.rmSync('build', { recursive: true });
        fs.mkdirSync('build');
    }
}


// check if main index exists
if (!fs.existsSync('index.json')) {
    console.error("Main index not found!");
    process.exit(1);
}

const index = JSON.parse(fs.readFileSync('index.json', 'utf8'));
console.log("Main index found!");
if (!test) {
    // copy main index
    fs.copyFileSync('index.json', 'build/index.json');
}

console.log(`Building indexes for: ${index.title}`);

const buildIndexes = async () => {
    const meta = await musicMetadata.loadMusicMetadata();
    console.log("Metadata parser initialized!");

    await Promise.all(index.artists.map(async artist => {
        console.log(`[L] Building indexes for library: ${artist.name}`);
        // 1 second wait
        // check if artist dir exists
        if (!fs.existsSync(`${artist.directory}`)) {
            throw new Error(`[E] Artist dir not found: ${artist}`);
        }

        if (!test) {
            // copy artist dir recursively
            fs.cpSync(`${artist.directory}`, `build/${artist.directory}`, { recursive: true });
        }

        // artist level index
        const artistIndex = {
            name: artist.name,
            avatar: artist.avatar,
            releases: artist.releases,
            directory: artist.directory
        }
        if (!test) {
            // write artist index
            fs.writeFileSync(`build/${artist.directory}/index.json`, JSON.stringify(artistIndex, null, 4));
        }

        for (const release of artist.releases) {
            console.log(`[R] Building indexes for release: ${release.title}`);
            // 2 second wait
            await new Promise(resolve => setTimeout(resolve, 2000));

            // check if release dir exists
            if (!fs.existsSync(`${release.directory}`)) {
                throw new Error(`[E] Release dir not found: ${release.directory}`);
            }

            // don't need to copy release dir, it's already copied
            // release level index
            const tracks = [];

            for (const track of fs.readdirSync(`${release.directory}`).filter(file => file.endsWith('.flac'))) {
                console.log(`[T] Parsing track metadata: ${track}`);
                const trackPath = `${release.directory}/${track}`;
                const newTrackPath = `${release.directory}/${track.replace(/.flac$/, '.m4a')}`;
                const trackMeta = await meta.parseFile(trackPath);
                tracks.push({
                    title: trackMeta.common.title,
                    artist: trackMeta.common.artist,
                    date: trackMeta.common.date,
                    album: trackMeta.common.album,
                    trackNo: trackMeta.common.track.no,
                    path: newTrackPath
                });
                console.log("[C] Convering track to AAC for HTTP streaming: ", track);
                // use async/await to wait for ffmpeg to finish
                await new Promise((resolve, reject) => {
                    // keep id3 tags, 320k bitrate, AAC codec, m4a container
                    FFMpeg(trackPath)
                        .outputOptions([
                            '-vn', // no video
                            '-c:a aac',
                            '-b:a 320k',
                            '-id3v2_version 3',
                            '-write_id3v1 1'
                        ])
                        .on('end', () => {
                            console.log("[D] Deleting flac from build: ", track);
                            // delete flac file
                            fs.rmSync("build/" + trackPath);
                            resolve();
                        })
                        .on('error', (err, stdout, stderr) => {
                            console.error(stderr);
                            reject(err);
                        })
                        .save("build/" + newTrackPath);
                });
            }

            const releaseIndex = {
                title: release.title,
                type: release.type,
                cover: release.cover,
                date: release.date,
                directory: release.directory,
                tracks: tracks
            }

            if (!test) {
                // write release index
                fs.writeFileSync(`build/${release.directory}/index.json`, JSON.stringify(releaseIndex, null, 4));
            }
        }
    }));
}

buildIndexes().then(() => {
    console.log("Library built successfully!");
}).catch(err => {
    console.error("Error building library: \n", err);
    process.exit(1);
});