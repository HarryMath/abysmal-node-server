const separator = -12;

const getLong = str => {
  const buffer = Buffer.alloc(8);
  buffer.fill(str, 8 - str.length, 8, 'ascii');
  return parseInt(buffer.readBigInt64BE());
};

const getFloat = str => {
  const buffer = Buffer.alloc(4);
  buffer.fill(str, 4 - str.length, 4, 'ascii');
  return buffer.readFloatBE(0);
};

const compressBytes = byteBuffer => {
  const array = new Int8Array(byteBuffer.buffer);
  // console.log('\ninitial array: ', array);
  for (let i = 0; i < array.length; i++) {
    if (array[i] !== 0) {
      let result = new Int8Array(byteBuffer.subarray(i))
      for (let j = 0; j < result.length; j++) {
        if (result[j] === separator) {
          result[j] = separator + 1;
        }
      }
      // console.log('result array: ', result);
      return Buffer.from(result);
    }
  }
  return Buffer.alloc(0);
}

const compressFloat = float => {
  const buffer = Buffer.alloc(4);
  buffer.writeFloatBE(float.toFixed(7), 0);
  return buffer;
}

const compressInt = float => {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(float.toFixed(7), 0);
  return buffer;
}

const compressBoolean = boolean => {
  return Buffer.from([boolean ? 1 : 0]);
}

const compressLong = long => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(long), 0);
  return buffer;
}

// const orig = 1652782459814;
// console.log("orig", orig)
// const compressed = compressLong(1652782459814);
// console.log("decoded", getLong(compressed.toString('ascii')))

module.exports = {getLong, getFloat, compressFloat, compressLong, compressBoolean}
