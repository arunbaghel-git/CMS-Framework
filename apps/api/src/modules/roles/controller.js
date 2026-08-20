import * as rolesService from './service.js'

/** Patla controller — abhi sirf list, kyunki role editing Phase 7 me hai. */
export async function list(_req, res, next) {
  try {
    const roles = await rolesService.listRoles()

    res.json({
      data: roles.map((r) => ({
        key: r.key,
        label: r.label,
        description: r.description,
        isBuiltIn: r.isBuiltIn,
        permissionCount: r.permissions?.length ?? 0,
      })),
    })
  } catch (err) {
    next(err)
  }
}
