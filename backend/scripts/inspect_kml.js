import https from 'https'

const url = 'https://data.opencity.in/dataset/51aa4fcb-a82b-4174-a6ea-419db3ab5575/resource/2d9be7f5-5c85-4676-b446-f346619f16ff/download/fd77cbbc-8bf9-4b47-a548-baa61a33b7fb.kml'

https.get(url, (res) => {
  let data = ''
  res.on('data', (chunk) => (data += chunk))
  res.on('end', () => {
    const matches = [...data.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)]
    console.log('Total placemarks in E-Waste Production Centres:', matches.length)
    if (matches.length > 0) {
      console.log('Sample placemark:\n', matches[0][1])
    }
  })
}).on('error', (err) => console.error(err))
