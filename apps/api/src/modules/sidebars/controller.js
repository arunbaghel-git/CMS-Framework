import * as sidebarService from './service.js'
import {
  createSidebarSchema,
  sidebarListQuerySchema,
  updateSidebarBodySchema,
} from './validation.js'

/** Patla controller — validate → service → response (R1). */

export async function list(req, res, next) {
  try {
    const query = sidebarListQuerySchema.parse(req.query)
    const { sidebars, meta } = await sidebarService.listSidebars(query)

    res.json({ data: { sidebars }, meta })
  } catch (err) {
    next(err)
  }
}

export async function get(req, res, next) {
  try {
    res.json({ data: { sidebar: await sidebarService.getSidebar(req.params.id) } })
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const input = createSidebarSchema.parse(req.body)

    res.status(201).json({ data: { sidebar: await sidebarService.createSidebar(input) } })
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const input = updateSidebarBodySchema.parse(req.body)

    res.json({ data: { sidebar: await sidebarService.updateSidebar(req.params.id, input) } })
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    res.json({ data: await sidebarService.deleteSidebar(req.params.id) })
  } catch (err) {
    next(err)
  }
}
