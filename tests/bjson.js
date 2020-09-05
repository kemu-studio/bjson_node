/*
 * Copyright (c) 2017,2020 by Kemu Studio (visit ke.mu)
 *
 * Author(s): Sylwester Wysocki <sw@ke.mu>,
 *            Roman Pietrzak <rp@ke.mu>
 *
 * This file is a part of the KEMU Binary JSON library.
 * See http://bjson.org for more.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

/* global suite */
/* global test */

const fs = require('fs')
const K  = require('kcore')

require('../src')

const BJSON_TESTS_PATH = './cases/'
const BJSON_TEMP_PATH  = './_temp/'

function _twoFilesShouldBeEql(filepath1, filepath2) {
  const buf1 = fs.readFileSync(filepath1)
  const buf2 = fs.readFileSync(filepath2)
  buf1.compare(buf2).should.be.eql(0)
}

function _jsonObjectsShouldBeEql(json1, json2) {
  const isNull1 = (json1 === null)
  const isNull2 = (json2 === null)

  isNull1.should.be.eql(isNull2)

  if ((!isNull1) && (!isNull2)) {
    json1.should.be.eql(json2)
  }
}

suite('BJSON', function() {
  // Make sure bjson temp dir exists.
  if (!fs.existsSync(BJSON_TEMP_PATH)) {
    fs.mkdirSync(BJSON_TEMP_PATH)
  }

  if (!fs.existsSync(BJSON_TEMP_PATH + '/symmetric')) {
    fs.mkdirSync(BJSON_TEMP_PATH + '/symmetric')
  }

  if (!fs.existsSync(BJSON_TEMP_PATH + '/encode')) {
    fs.mkdirSync(BJSON_TEMP_PATH + '/encode')
  }

  if (!fs.existsSync(BJSON_TEMP_PATH + '/decode')) {
    fs.mkdirSync(BJSON_TEMP_PATH + '/decode')
  }

  // Helper function to create encode() test for given test pair.
  const _createEncodeTest = (category, testName) => test(category + ': encode (' + testName + ')', function(done) {
    const jsonPath          = BJSON_TESTS_PATH + category + '/' + testName + '.json'
    const bjsonExpectedPath = BJSON_TESTS_PATH + category + '/' + testName + '.bjson'
    const bjsonResultPath   = BJSON_TEMP_PATH  + category + '/' + testName + '.bjson'

    // Load input json and expected bjson result.
    fs.readFile(jsonPath, (err, jsonString) => {
      fs.readFile(bjsonExpectedPath, (err, bjsonExpected) => {

        // Encode input json into bjson using BJSON library.
        const json   = JSON.parse(jsonString)
        const buffer = K.BJSON.encode(json)

        // Save encoded buffer into temp file.
        fs.writeFile(bjsonResultPath, buffer, err => {

          // Compare bjson result with expected one.
          _twoFilesShouldBeEql(bjsonResultPath, bjsonExpectedPath)

          done()
        })
      })
    })
  })

  // Helper function to create decode() test for given test pair.
  const _createDecodeTest = (category, testName) => test(category + ': decode (' + testName + ')', function(done) {
    const bjsonPath        = BJSON_TESTS_PATH + category + '/' + testName + '.bjson'
    const jsonExpectedPath = BJSON_TESTS_PATH + category + '/' + testName + '.json'
    const jsonResultPath   = BJSON_TEMP_PATH  + category + '/' + testName + '.json'

    // Load input bjson and expected json result.
    fs.readFile(bjsonPath, (err, bjsonBuffer) => {
      fs.readFile(jsonExpectedPath, (err, jsonExpectedBuffer) => {

        // Decode input bjson binary buffer into pure json object.
        const json = K.BJSON.decode(bjsonBuffer)

        // Save decoded json as pure text file (for debug purpose only).
        const jsonString = JSON.stringify(json, null, 2)
        fs.writeFile(jsonResultPath, jsonString, err => {

          // Compare decoded json with expected one.
          const jsonExpected = JSON.parse(jsonExpectedBuffer.toString())
          _jsonObjectsShouldBeEql(json, jsonExpected)

          done()
        })
      })
    })
  })

  // Helper function to create decode() beheavior when corrupted data
  // is passed on input.
  const _createCorruptedTest = testName => test('corrupted (' + testName + ')', function(done) {
    const bjsonPath = BJSON_TESTS_PATH + '/corrupted/' + testName + '.bjson'

    // Load corrupted bjson.
    fs.readFile(bjsonPath, (err, bjsonBuffer) => {

      // Try decode loaded buffer - should fails.
      let isCorruptedThrown = false
      try {
        K.BJSON.decode(bjsonBuffer)
      } catch (error) {
        err = error
        if (err.getErrorCode() === 'corruptedData') {
          isCorruptedThrown = true
        }
      }

      isCorruptedThrown.should.be.eql(true)

      done()
    })
  })

  // Symmetric (bidirectional) tests.
  // Create one suite per each test pair.
  suite('symmetric', function() {
    const arrayOfFiles = fs.readdirSync(BJSON_TESTS_PATH + '/symmetric')

    for (let file of arrayOfFiles) {
      if (file.indexOf('.json') !== -1) {
        const testName = file.slice(0, -5)
        suite(testName, function() {
          // Create encode() and decode() tests per each test pair.
          _createEncodeTest('symmetric', testName)
          _createDecodeTest('symmetric', testName)
        })
      }
    }
  })

  // Encode only (one way) tests.
  // Create one suite per each test pair.
  suite('encode only (one way)', function() {
    const arrayOfFiles = fs.readdirSync(BJSON_TESTS_PATH + '/encode')

    for (let file of arrayOfFiles) {
      if (file.indexOf('.json') !== -1) {
        const testName = file.slice(0, -5)
        // Create encode() and decode() tests per each test pair.
        _createEncodeTest('encode', testName)
      }
    }
  })

  // Decode only (one way) tests.
  // Create one suite per each test pair.
  suite('decode only (one way)', function() {
    const arrayOfFiles = fs.readdirSync(BJSON_TESTS_PATH + '/decode')

    for (let file of arrayOfFiles) {
      if (file.indexOf('.json') !== -1) {
        const testName = file.slice(0, -5)
        // Create encode() and decode() tests per each test pair.
        _createDecodeTest('decode', testName)
      }
    }
  })

  // Attemp to decode corrupted bjson buffer.
  suite('corrupted data', function() {
    const arrayOfFiles = fs.readdirSync(BJSON_TESTS_PATH + '/corrupted')

    for (let file of arrayOfFiles) {
      if (file.indexOf('.bjson') !== -1) {
        const testName = file.slice(0, -6)
        // Create encode() and decode() tests per each test pair.
        _createCorruptedTest(testName)
      }
    }
  })
})
