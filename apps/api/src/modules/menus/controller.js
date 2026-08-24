import * as menuService from './service.js'
import {
  createMenuSchema,
  listMenusQuerySchema,
  setMenuLocationsSchema,
  updateMenuSchema,
} from './validation.js'

/** Patla controller — validate → service → response (R1). */

export async function list(req, res, next) {
  try {
    const query = listMenusQuerySchema.parse(req.query)
    const { menus, meta } = await menuService.listMenus(query)

    res.json({ data: { menus }, meta })
  } catch (err) {
    next(err)
  }
}

export async function get(req, res, next) {
  try {
    res.json({ data: { menu: await menuService.getMenu(req.params.id) } })
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const input = createMenuSchema.parse(req.body)

    res.status(201).json({ data: { menu: await menuService.createMenu(input) } })
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const input = updateMenuSchema.parse(req.body)

    res.json({ data: { menu: await menuService.updateMenu(req.params.id, input) } })
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    res.json({ data: await menuService.deleteMenu(req.params.id) })
  } catch (err) {
    next(err)
  }
}

export async function getLocations(_req, res, next) {
  try {
    res.json({ data: { locations: await menuService.getMenuLocations() } })
  } catch (err) {
    next(err)
  }
}

export async function setLocations(req, res, next) {
  try {
    const input = setMenuLocationsSchema.parse(req.body)

    res.json({ data: { locations: await menuService.setMenuLocations(input) } })
  } catch (err) {
    next(err)
  }
}
