[![NPM version](http://img.shields.io/npm/v/@kmu/bjson_node?style=flat)](https://npmjs.org/package/@kmu/bjson_node)
[![Git Commit](https://img.shields.io/github/last-commit/kemu-studio/bjson_node?style=flat)](https://github.com/kemu-studio/bjson_node/commits/master)
[![CircleCI](https://circleci.com/gh/kemu-studio/bjson_node.svg?style=svg)](https://app.circleci.com/pipelines/github/kemu-studio/bjson_node)
<!-- [![Git Releases](https://img.shields.io/github/release/kemu-studio/bjson_node?style=flat)](https://github.com/kemu-studio/bjson_node/releases) -->

# bjson_node: binary JSON for node.js (encoder/decoder)
This is reference BJSON implementation for JavaScript.
- for protocol details please visit http://bjson.org
- for C/C++ implementation please visit https://github.com/kemu-studio/bjson_c

# Usage
## Encoding example
```javascript
  // Import BJSON module.
  const bjson = require('@kmu/bjson_node')

  // Encode example JSON object into binary buffer.
  const buf = bjson.encode({
    x: 1,
    y: 3.14,
    z: 'hello from BJSON'
  })

  // Show encoded data.
  // This line should print out JSON document encoded as binary data:
  // <Buffer 24 25 10 01 78 1b 10 01 79 0f 1f 85 eb 51 b8 1e 09 40 10 01 7a 10 10 68 65 6c 6c 6f 20 66 72 6f 6d 20 42 4a 53 4f 4e>
  console.log(buf)
```

## Decoding example
```javascript
  // Import BJSON module.
  const bjson = require('@kmu/bjson_node')

  // Decode binary buffer generated in encoder example above.
  const encodedData = Buffer.from([
    0x24, 0x25, 0x10, 0x01, 0x78, 0x1b, 0x10, 0x01,
    0x79, 0x0f, 0x1f, 0x85, 0xeb, 0x51, 0xb8, 0x1e,
    0x09, 0x40, 0x10, 0x01, 0x7a, 0x10, 0x10, 0x68,
    0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x66, 0x72, 0x6f,
    0x6d, 0x20, 0x42, 0x4a, 0x53, 0x4f, 0x4e
  ])

  const plainData = bjson.decode(encodedData)

  // Show decoded JSON document.
  // This line should prints out plain JSON data build from binary buffer:
  // { x: 1, y: 3.14, z: 'hello from BJSON' }
  console.log(plainData)
```

# Limitations
Because JS stores all numbers as 64-bit float there is no way to encode
pure 64-bit integer. Maximum integer is limited by amount of bits used to
store mantisa part, that stays for 53bits for 64-bit floats (double).

Due to this limitation below types are not supported:

- array64 (decode/decode)
- map64 (encode/decode)
- string64 (encode/decode)
- binary64 (encode/decode)

After that:
- Integers greater to 4294967295 (out of 32-bit limit) are encoded as 64-bit float.
- There is no way to decode 64-bit integer.
