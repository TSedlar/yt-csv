const csv = require('fast-csv')

module.exports = (path) => new Promise((resolve, reject) => {
  let rows = []
  csv
    .fromPath(path)
    .on('data', data => rows.push(data))
    .on('end', () => {
      let header = rows[0]
      resolve(rows.slice(1).map(data => {
        let object = {}
        for (let i = 0; i < header.length; i++) {
          let headerText = header[i].trim()
            .replace(/\s+/g, '_')
            .replace(/\(|\)/g, '')
            .toLowerCase()
          object[headerText] = data[i]
        }
        return object
      }))
    })
    .on('err', err => reject(err))
})