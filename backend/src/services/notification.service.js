exports.sendPush = async ({ deviceToken, title, body, data }) => {
  console.log('PUSH (mock)', deviceToken, title, body, data);
  return true;
};
