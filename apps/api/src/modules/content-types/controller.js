import * as contentTypeService from './service.js'
import {
  contentTypeListQuerySchema,
  createContentTypeSchema,
  updateContentTypeSchema,
} from './validation.js'

/** Patla controller — validate → service → response (R1). */

export async function list(req, res, next) {
  try {
    const query = contentTypeListQuerySchema.parse(req.query)
    const { contentTypes, meta } = await contentTypeService.listContentTypes(query)

    res.json({ data: { contentTypes }, meta })
  } catch (err) {
    next(err)
  }
}

export async function get(req, res, next) {
  try {
    res.json({ data: { contentType: await contentTypeService.getContentType(req.params.id) } })
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const input = createContentTypeSchema.parse(req.body)

    res
      .status(201)
      .json({ data: { contentType: await contentTypeService.createContentType(input) } })
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const input = updateContentTypeSchema.parse(req.body)

    res.json({
      data: { contentType: await contentTypeService.updateContentType(req.params.id, input) },
    })
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    res.json({ data: await contentTypeService.deleteContentType(req.params.id) })
  } catch (err) {
    next(err)
  }
}
