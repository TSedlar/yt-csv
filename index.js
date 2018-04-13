const spotify = require('./lib/spotify')
const ytdl = require('ytdl-core')
const fs = require('fs')
const ffmpeg = require('fluent-ffmpeg')
const ID3Writer = require('browser-id3-writer')
const fetch = require('node-fetch')
const mkdirp = require('mkdirp')

const FFMPEG_PATH = require('ffmpeg-static').path
const OPTS = {
  quality: 'highestaudio',
  filter: 'audioonly'
}

ffmpeg.setFfmpegPath(FFMPEG_PATH)

let convertToMP3 = (path) => new Promise((resolve, reject) => {
  let tmp = path.replace('.mp3', '.bak.mp3')
  return ffmpeg(path).outputOptions('-c:a', 'mp3')
    .save(tmp)
    .on('end', () => {
      fs.unlinkSync(path)
      fs.renameSync(tmp, path)
      resolve(path)
    })
    .on('error', err => reject(err))
})

let applyTags = (path, tags) => {
  fetch(tags['cover'])
    .then(data => data.buffer())
    .then(artBuffer => {
      const writer = new ID3Writer(fs.readFileSync(path))
      writer
        .setFrame('TPE1', [tags['artist_name']])
        .setFrame('TPE3', tags['artist_name'])
        .setFrame('TPE4', tags['artist_name'])
        .setFrame('TIT2', tags['track_name'])
        .setFrame('TALB', tags['album_name'])
        .setFrame('TPOS', tags['disc_number'])
        .setFrame('TRCK', tags['track_number'])
        .setFrame('TCON', [tags['genre']])
        .setFrame('APIC', {
          type: 3,
          data: artBuffer,
          description: 'Cover (front)'
        })
      writer.addTag()
      let tmp = path.replace('.mp3', '.bak.mp3')
      fs.writeFileSync(tmp, Buffer.from(writer.arrayBuffer))
      fs.unlinkSync(path)
      fs.renameSync(tmp, path)
    })
}

let download = (track) => new Promise((resolve, reject) => {
  let dir = `./downloads/${track['artist_name']}/${track['album_name']}/`
  let path = `${dir}/${track['track_name']}.mp3`
  console.log(`downloading ${path}`)
  mkdirp.sync(dir)
  ytdl(track['youtube_link'], OPTS)
    .pipe(fs.createWriteStream(path))
    .on('finish', () => {
      console.log('converting to mp3...')
      convertToMP3(path)
        .then(path => {
          console.log('applying tags...')
          applyTags(path, track)
        })
    })
    .on('error', err => reject(err))
})

spotify.modifyCSV('./playlist.csv')
  .then(songs => {
    // console.log(songs)
    let promises = []
    for (song of songs) {
      promises.push(download(song))
    }
    return Promise.all(promises)
  })
  .catch(err => console.log(err))