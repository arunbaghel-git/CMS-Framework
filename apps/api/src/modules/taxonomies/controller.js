import * as taxonomyService from './service.js'
import {
  createTaxonomySchema,
  taxonomyListQuerySchema,
  updateTaxonomySchema,
} from './validation.js'

/** Patla controller — validate → service → response (R1). */

export async function list(req, res, next) {
  try {
    const query = taxonomyListQuerySchema.parse(req.query)
    const { taxonomies, meta } = await taxonomyService.listTaxonomies(query)

    res.json({ data: { taxonomies }, meta })
  } catch (err) {
    next(err)
  }
}

export async function get(req, res, next) {
  try {
    res.json({ data: { taxonomy: await taxonomyService.getTaxonomy(req.params.id) } })
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const input = createTaxonomySchema.parse(req.body)

    res.status(201).json({ data: { taxonomy: await taxonomyService.createTaxonomy(input) } })
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const input = updateTaxonomySchema.parse(req.body)

    res.json({ data: { taxonomy: await taxonomyService.updateTaxonomy(req.params.id, input) } })
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    res.json({ data: await taxonomyService.deleteTaxonomy(req.params.id) })
  } catch (err) {
    next(err)
  }
}
