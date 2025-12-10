const multer = require('multer');

const storage = multer.memoryStorage();

//Single Upload
const singleUpload = multer({ storage }).single("file");

//Multiple Upload upto 5 image
const multipleUpload = multer({ storage }).array("files", 5); //Fix Limit 5

module.exports = { singleUpload, multipleUpload }