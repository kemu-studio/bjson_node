require('should')

const Mocha = require('mocha')
const mocha = new Mocha({ui: 'tdd', reporter: 'spec', bail: 'yes'});

mocha.addFile('bjson')
mocha.run()
