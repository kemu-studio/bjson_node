const fs = require('fs')

if (fs.existsSync('./_temp')) {
  process.stdout.write('removing \'tests/_temp\' directory... ')
  fs.rmdirSync('./_temp', {recursive: true})
  console.log('OK')

} else {
  console.log('nothing to do')
}