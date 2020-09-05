# bjson_node
BJSON: binary JSON for node.js (encoder/decoder)

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
