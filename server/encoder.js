const getLong = str => {
  const buffer = Buffer.alloc(8);
  // buffer.write(str, 8 - str.length, 'ascii');
  buffer.fill(str, 8 - str.length, 8, 'ascii');
  return parseInt(buffer.readBigInt64BE());
};

const getFloat = str => {
  const buffer = Buffer.alloc(4);
  buffer.write(str, 4 - str.length, 'ascii');
  return buffer.readFloatBE(0);
};

module.exports = {getLong, getFloat};
