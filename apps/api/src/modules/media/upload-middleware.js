import multer from 'multer'

import { env } from '../../core/env.js'
import { badRequest } from '../../core/errors.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
  },
})

const singleFile = upload.single('file')

/**
 * Multipart parser. File disk pe nahi jaati; validation + variants service me hote hain.
 */
export function parseSingleMediaUpload(req, res, next) {
  singleFile(req, res, (err) => {
    if (!err) return next()

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(badRequest(`Uploaded file is too large. Max size is ${env.MAX_UPLOAD_MB}MB`))
      }
      return next(badRequest(err.message))
    }

    return next(err)
  })
}
