const fs = require('fs');
const musicMetadata = require('music-metadata');

const generateReadme = async () => {
    const meta = await musicMetadata.loadMusicMetadata();
    const mainIndex = JSON.parse(fs.readFileSync('index.json', 'utf8'));
    const readmeSample = fs.readFileSync('README.sample.md', 'utf8');

    const artists = await Promise.all(mainIndex.artists.map(async artist => {
        const artistName = artist.name;
        const releases = []
        artist.releases.sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
        for (let release of artist.releases) {
            const releaseTitle = release.title;
            const tracks = []
            for (const track of fs.readdirSync(`${release.directory}`).filter(file => file.endsWith('.flac'))) {
                const metadata = await meta.parseFile(`${release.directory}/${track}`);
                const title = metadata.common.title || trackIndex.title;
                tracks.push(title);
            }
            releases.push({ title: releaseTitle, tracks });
        }
        return { artist: artistName, releases };
    }));

    let TOC = "```\n"

    artists.forEach(artist => {
        TOC += `${artist.artist}\n`
        // tree structure for releases, directories and tracks
        artist.releases.forEach(release => {
            TOC += `|--- ${release.title}\n`
            release.tracks.forEach(track => {
                TOC += `|   |--- ${track}\n`
            });
        });
    })
    TOC += "```\n"
    const readme = readmeSample.replace("{{TOC}}", TOC);
    fs.writeFileSync('README.md', readme);
    console.log("README.md generated!");
}

generateReadme();