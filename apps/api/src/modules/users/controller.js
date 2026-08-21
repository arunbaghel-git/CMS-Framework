import { toPublicUser } from '@cms/shared'

import * as usersService from './service.js'
import {
  createUserSchema,
  deleteUserSchema,
  listUsersQuerySchema,
  updateMeSchema,
  updateUserSchema,
} from './validation.js'

/** Patla controller — validate → service → response. */

// ── apni profile ──────────────────────────────────────────────────────────────

export async function getMe(req, res) {
  res.json({ data: { user: toPublicUser(req.user, req.permissions) } })
}

export async function updateMe(req, res, next) {
  try {
    const input = updateMeSchema.parse(req.body)
    const user = await usersService.updateMe(String(req.user._id), input)
    res.json({ data: { user: { ...user, permissions: req.permissions } } })
  } catch (err) {
    next(err)
  }
}

// ── users management ──────────────────────────────────────────────────────────

export async function list(req, res, next) {
  try {
    // R9 — query kabhi seedha Mongoose me nahi jaati
    const query = listUsersQuerySchema.parse(req.query)
    const { data, meta } = await usersService.listUsers(query)
    res.json({ data, meta })
  } catch (err) {
    next(err)
  }
}

export async function getOne(req, res, next) {
  try {
    res.json({ data: { user: await usersService.getUser(req.params.id) } })
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const input = createUserSchema.parse(req.body)
    const user = await usersService.createUser(input, { actor: req.user })
    res.status(201).json({ data: { user } })
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const input = updateUserSchema.parse(req.body)
    const user = await usersService.updateUser(req.params.id, input, req.user)
    res.json({ data: { user } })
  } catch (err) {
    next(err)
  }
}

export async function deactivate(req, res, next) {
  try {
    const user = await usersService.deactivateUser(req.params.id, req.user)
    res.json({ data: { user } })
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    const input = deleteUserSchema.parse(req.body ?? {})
    const result = await usersService.deleteUser(req.params.id, input, req.user)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}
