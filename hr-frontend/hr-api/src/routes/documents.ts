import { Router } from 'express'
import { query } from '../db.js'
import { isAdminOrHr } from '../authorization/index.js'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'
import { loadContext } from '../services/employeeContext.js'
import { uploadPdf } from '../middleware/upload.js'
import {
  uploadBlob,
  getSignedUrl,
  deleteBlob,
  DOCUMENTS_CONTAINER,
} from '../services/blobStorage.js'

export const documentsRouter = Router()

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(v: string): boolean {
  return UUID_RE.test(v)
}

const VALID_DOCUMENT_TYPES = new Set([
  'Passport',
  'Right to Work',
  'DBS Certificate',
  'GPhC Registration',
  'Professional Indemnity',
  'Training Certificate',
  'Other',
])

// GET /api/documents?employee_id=xxx
documentsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const ctx = await loadContext(req.authUser!)
  const params: unknown[] = []
  const conditions: string[] = []
  let i = 1

  if (isAdminOrHr(ctx.role)) {
    if (req.query.employee_id && typeof req.query.employee_id === 'string') {
      conditions.push(`employee_id = $${i++}`)
      params.push(req.query.employee_id)
    }
  } else if (ctx.role === 'manager') {
    conditions.push(`(
      employee_id = $${i} OR
      employee_id IN (
        SELECT employee_id FROM employees WHERE manager_id = $${i}
      )
    )`)
    params.push(ctx.employeeId)
    i++
  } else {
    conditions.push(`employee_id = $${i++}`)
    params.push(ctx.employeeId)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const result = await query(
    `SELECT * FROM documents ${where} ORDER BY uploaded_at DESC NULLS LAST`,
    params
  )
  res.json({ documents: result.rows })
})

// POST /api/documents — multipart/form-data
documentsRouter.post(
  '/',
  uploadPdf.single('file'),
  async (req: AuthenticatedRequest, res) => {
    const ctx = await loadContext(req.authUser!)
    const body = req.body as Record<string, string>

    const file = req.file
    if (!file) {
      res.status(400).json({ error: 'bad_request', message: 'A PDF file is required' })
      return
    }

    // Employees upload their own; HR/admin can specify any employee_id
    const employeeId = isAdminOrHr(ctx.role) && body.employee_id
      ? body.employee_id
      : ctx.employeeId

    if (!employeeId || !isUuid(employeeId)) {
      res.status(400).json({ error: 'bad_request', message: 'Invalid employee_id' })
      return
    }

    const documentType = body.document_type
    if (!documentType || !VALID_DOCUMENT_TYPES.has(documentType)) {
      res.status(400).json({
        error: 'bad_request',
        message: `document_type must be one of: ${[...VALID_DOCUMENT_TYPES].join(', ')}`,
      })
      return
    }

    const blobName = `${employeeId}/${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`
    try {
      await uploadBlob(DOCUMENTS_CONTAINER, blobName, file.buffer, file.mimetype)
    } catch (err) {
      console.error('Blob upload failed:', err)
      res.status(500).json({ error: 'upload_failed', message: 'File upload failed' })
      return
    }

    const result = await query(
      `INSERT INTO documents
        (document_id, employee_id, document_type, file_path, file_name, uploaded_at)
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, NOW())
       RETURNING *`,
      [employeeId, documentType, blobName, file.originalname]
    )

    res.status(201).json({ document: result.rows[0] })
  }
)

// GET /api/documents/:id/download
documentsRouter.get('/:id/download', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  if (!isUuid(id)) {
    res.status(404).json({ error: 'not_found', message: 'Document not found' })
    return
  }

  const ctx = await loadContext(req.authUser!)
  const result = await query(
    'SELECT * FROM documents WHERE document_id = $1',
    [id]
  )
  const doc = result.rows[0]
  if (!doc) {
    res.status(404).json({ error: 'not_found', message: 'Document not found' })
    return
  }

  const canAccess =
    isAdminOrHr(ctx.role) ||
    doc.employee_id === ctx.employeeId ||
    (ctx.role === 'manager' && await isDirectReport(ctx.employeeId, doc.employee_id))

  if (!canAccess) {
    res.status(403).json({ error: 'forbidden', message: 'Access denied' })
    return
  }

  if (!doc.file_path) {
    res.status(404).json({ error: 'not_found', message: 'No file attached to this document' })
    return
  }

  try {
    const url = await getSignedUrl(DOCUMENTS_CONTAINER, doc.file_path, 60)
    res.json({ url })
  } catch (err) {
    console.error('SAS generation failed:', err)
    res.status(500).json({ error: 'server_error', message: 'Could not generate download link' })
  }
})

// DELETE /api/documents/:id — HR/admin only
documentsRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  if (!isUuid(id)) {
    res.status(404).json({ error: 'not_found', message: 'Document not found' })
    return
  }

  const ctx = await loadContext(req.authUser!)
  if (!isAdminOrHr(ctx.role)) {
    res.status(403).json({ error: 'forbidden', message: 'Only HR or admin can delete documents' })
    return
  }

  const result = await query(
    'SELECT * FROM documents WHERE document_id = $1',
    [id]
  )
  const doc = result.rows[0]
  if (!doc) {
    res.status(404).json({ error: 'not_found', message: 'Document not found' })
    return
  }

  if (doc.file_path) {
    try {
      await deleteBlob(DOCUMENTS_CONTAINER, doc.file_path)
    } catch (err) {
      console.error('Blob delete failed (continuing):', err)
    }
  }

  await query('DELETE FROM documents WHERE document_id = $1', [id])
  res.json({ success: true })
})

async function isDirectReport(managerId: string, targetId: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM employees WHERE employee_id = $1 AND manager_id = $2',
    [targetId, managerId]
  )
  return result.rows.length > 0
}