const multer = require('multer')
const path = require('path')

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  if(file.mimetype.startsWith('image')) {
    cb(null, true)
  }else {
    cb(new Error('Veuillez envoyer une image'), false)
  }
}

const upload = multer({
  storage,
  fileFilter
})

module.exports = upload