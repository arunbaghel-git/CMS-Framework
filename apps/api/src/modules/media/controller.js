import * as mediaService from './service.js'
import { listMediaQuerySchema, updateMediaSchema } from './validation.js'
import { badRequest } from '../../core/errors.js'

/** Patla controller: validate -> service -> response. */

export async function list(req, res, next) {
  try {
    const query = listMediaQuerySchema.parse(req.query)
    const { data, meta } = await mediaService.listMedia(query)
    res.json({ data, meta })
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    if (!req.file) throw badRequest('Upload file is required')

    const metadata = updateMediaSchema.parse(req.body ?? {})
    const media = await mediaService.createMediaFromUpload({
      filename: req.file.originalname,
      declaredMime: req.file.mimetype,
      size: req.file.size,
      bytes: req.file.buffer,
      uploadedBy: String(req.user._id),
      ...metadata,
    })

    res.status(201).json({ data: { media } })
  } catch (err) {
    next(err)
  }
}

export async function getOne(req, res, next) {
  try {
    res.json({ data: { media: await mediaService.getMedia(req.params.id) } })
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const input = updateMediaSchema.parse(req.body)
    const media = await mediaService.updateMedia(req.params.id, input)
    res.json({ data: { media } })
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    res.json({ data: await mediaService.trashMedia(req.params.id) })
  } catch (err) {
    next(err)
  }
}
