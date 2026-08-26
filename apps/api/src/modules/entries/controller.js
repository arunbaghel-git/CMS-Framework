import * as entryService from './service.js'
import {
  bulkEntrySchema,
  entryCountsQuerySchema,
  entryCreateSchema,
  entryListQuerySchema,
  entryUpdateSchema,
  publishEntrySchema,
  revisionListQuerySchema,
} from './validation.js'

/**
 * Patla controller — validate → service → response (R1).
 *
 * `actor` service ko `{ user, permissions }` ki tarah jaata hai, sirf `req` nahi: `.own`
 * wale permissions ka asli check service me hota hai (spec 001), aur use dono cheezein
 * chahiye. Poora `req` bhejne ka matlab hota ki service Express se bandh jaati aur uske
 * unit test ke liye ek nakli request banani padti.
 */
const actorOf = (req) => ({ user: req.user, permissions: req.permissions ?? [] })

export async function list(req, res, next) {
  try {
    const query = entryListQuerySchema.parse(req.query)
    const { entries, meta } = await entryService.listEntries(query)

    res.json({ data: { entries }, meta })
  } catch (err) {
    next(err)
  }
}

export async function counts(req, res, next) {
  try {
    const { type } = entryCountsQuerySchema.parse(req.query)

    res.json({ data: { counts: await entryService.entryCounts(type) } })
  } catch (err) {
    next(err)
  }
}

export async function bulk(req, res, next) {
  try {
    const input = bulkEntrySchema.parse(req.body)

    res.json({ data: await entryService.bulkEntries(input, actorOf(req)) })
  } catch (err) {
    next(err)
  }
}

export async function get(req, res, next) {
  try {
    res.json({ data: { entry: await entryService.getEntry(req.params.id) } })
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const input = entryCreateSchema.parse(req.body)

    res.status(201).json({ data: { entry: await entryService.createEntry(input, actorOf(req)) } })
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const input = entryUpdateSchema.parse(req.body)

    res.json({
      data: { entry: await entryService.updateEntry(req.params.id, input, actorOf(req)) },
    })
  } catch (err) {
    next(err)
  }
}

export async function publish(req, res, next) {
  try {
    const input = publishEntrySchema.parse(req.body ?? {})

    res.json({
      data: { entry: await entryService.publishEntry(req.params.id, input, actorOf(req)) },
    })
  } catch (err) {
    next(err)
  }
}

export async function unpublish(req, res, next) {
  try {
    res.json({ data: { entry: await entryService.unpublishEntry(req.params.id) } })
  } catch (err) {
    next(err)
  }
}

export async function submitReview(req, res, next) {
  try {
    res.json({ data: { entry: await entryService.submitForReview(req.params.id, actorOf(req)) } })
  } catch (err) {
    next(err)
  }
}

export async function duplicate(req, res, next) {
  try {
    res
      .status(201)
      .json({ data: { entry: await entryService.duplicateEntry(req.params.id, actorOf(req)) } })
  } catch (err) {
    next(err)
  }
}

export async function trash(req, res, next) {
  try {
    res.json({ data: await entryService.trashEntry(req.params.id, actorOf(req)) })
  } catch (err) {
    next(err)
  }
}

export async function restore(req, res, next) {
  try {
    res.json({ data: { entry: await entryService.restoreEntry(req.params.id) } })
  } catch (err) {
    next(err)
  }
}

export async function purge(req, res, next) {
  try {
    res.json({ data: await entryService.purgeEntry(req.params.id) })
  } catch (err) {
    next(err)
  }
}

export async function listRevisions(req, res, next) {
  try {
    const query = revisionListQuerySchema.parse(req.query)
    const { revisions, meta } = await entryService.listRevisions(req.params.id, query)

    res.json({ data: { revisions }, meta })
  } catch (err) {
    next(err)
  }
}

export async function restoreRevision(req, res, next) {
  try {
    const entry = await entryService.restoreRevision(
      req.params.id,
      req.params.revisionId,
      actorOf(req),
    )

    res.json({ data: { entry } })
  } catch (err) {
    next(err)
  }
}
