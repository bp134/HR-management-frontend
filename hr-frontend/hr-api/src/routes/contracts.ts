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
  CONTRACTS_CONTAINER,
} from '../services/blobStorage.js'

export const contractsRouter = Router()

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(v: string): boolean {
  return UUID_RE.test(v)
}

// GET /api/contracts?employee_id=xxx
// HR/admin see all; managers see team; employees see own
contractsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const ctx = await loadContext(req.authUser!)
  const params: unknown[] = []
  const conditions: string[] = []
  let i = 1

  if (isAdminOrHr(ctx.role)) {
    // No filter — see all
    if (req.query.employee_id && typeof req.query.employee_id === 'string') {
      conditions.push(`employee_id = $${i++}`)
      params.push(req.query.employee_id)
    }
  } else if (ctx.role === 'manager') {
    // Own contracts plus direct reports
    conditions.push(`(
      employee_id = $${i} OR
      employee_id IN (
        SELECT employee_id FROM employees WHERE manager_id = $${i}
      )
    )`)
    params.push(ctx.employeeId)
    i++
  } else {
    // Employee — own only
    conditions.push(`employee_id = $${i++}`)
    params.push(ctx.employeeId)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const result = await query(
    `SELECT * FROM contracts ${where} ORDER BY start_date DESC NULLS LAST`,
    params
  )
  res.json({ contracts: result.rows })
})

// POST /api/contracts — multipart/form-data with PDF + metadata
// HR/admin only
contractsRouter.post(
  '/',
  uploadPdf.single('file'),
  async (req: AuthenticatedRequest, res) => {
    const ctx = await loadContext(req.authUser!)
    if (!isAdminOrHr(ctx.role)) {
      res.status(403).json({ error: 'forbidden', message: 'Only HR or admin can upload contracts' })
      return
    }

    const file = req.file
    if (!file) {
      res.status(400).json({ error: 'bad_request', message: 'A PDF file is required' })
      return
    }

    const body = req.body as Record<string, string>
    const employeeId = body.employee_id
    if (!employeeId || !isUuid(employeeId)) {
      res.status(400).json({ error: 'bad_request', message: 'A valid employee_id is required' })
      return
    }

    // Verify employee exists
    const empCheck = await query(
      'SELECT employee_id FROM employees WHERE employee_id = $1',
      [employeeId]
    )
    if (!empCheck.rows[0]) {
      res.status(404).json({ error: 'not_found', message: 'Employee not found' })
      return
    }

    // Upload to Azure Blob Storage
    const blobName = `${employeeId}/${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`
    try {
      await uploadBlob(CONTRACTS_CONTAINER, blobName, file.buffer, file.mimetype)
    } catch (err) {
      console.error('Blob upload failed:', err)
      res.status(500).json({ error: 'upload_failed', message: 'File upload failed' })
      return
    }

    // Save record to database
    const result = await query(
      `INSERT INTO contracts
        (contract_id, employee_id, file_path, file_name,
         contract_type, salary, hourly_rate, contracted_hours, start_date, end_date)
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        employeeId,
        blobName,
        file.originalname,
        body.contract_type || null,
        body.salary ? parseFloat(body.salary) : null,
        body.hourly_rate ? parseFloat(body.hourly_rate) : null,
        body.contracted_hours ? parseInt(body.contracted_hours) : null,
        body.start_date || null,
        body.end_date || null,
      ]
    )

    res.status(201).json({ contract: result.rows[0] })
  }
)

// GET /api/contracts/:id/download — returns a short-lived signed URL
contractsRouter.get('/:id/download', async (req: AuthenticatedRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
if (!id || !isUuid(id)) {
    res.status(404).json({ error: 'not_found', message: 'Contract not found' })
    return
  }

  const ctx = await loadContext(req.authUser!)
  const result = await query(
    'SELECT * FROM contracts WHERE contract_id = $1',
    [id]
  )
  const contract = result.rows[0]
  if (!contract) {
    res.status(404).json({ error: 'not_found', message: 'Contract not found' })
    return
  }

  // Access check
  const contractEmployeeId = contract.employee_id
  const requesterEmployeeId = ctx.employeeId
  const canAccess =
    isAdminOrHr(ctx.role) ||
    contractEmployeeId === requesterEmployeeId ||
    (ctx.role === 'manager' &&
      requesterEmployeeId != null &&
      contractEmployeeId != null &&
      await isDirectReport(requesterEmployeeId, contractEmployeeId))

  if (!canAccess) {
    res.status(403).json({ error: 'forbidden', message: 'Access denied' })
    return
  }

  const filePath = contract.file_path as string | null
if (!filePath) {
  res.status(404).json({ error: 'not_found', message: 'No file attached to this contract' })
  return
}

try {
  const url = await getSignedUrl(CONTRACTS_CONTAINER, filePath, 60)
    res.json({ url })
  } catch (err) {
    console.error('SAS generation failed:', err)
    res.status(500).json({ error: 'server_error', message: 'Could not generate download link' })
  }
})

// DELETE /api/contracts/:id — HR/admin only
contractsRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
if (!id || !isUuid(id)) {
    res.status(404).json({ error: 'not_found', message: 'Contract not found' })
    return
  }

  const ctx = await loadContext(req.authUser!)
  if (!isAdminOrHr(ctx.role)) {
    res.status(403).json({ error: 'forbidden', message: 'Only HR or admin can delete contracts' })
    return
  }

  const result = await query(
    'SELECT * FROM contracts WHERE contract_id = $1',
    [id]
  )
  const contract = result.rows[0]
  if (!contract) {
    res.status(404).json({ error: 'not_found', message: 'Contract not found' })
    return
  }

  // Delete from blob storage first
  if (contract.file_path) {
    try {
      await deleteBlob(CONTRACTS_CONTAINER, contract.file_path!)
    } catch (err) {
      console.error('Blob delete failed (continuing):', err)
    }
  }

  await query('DELETE FROM contracts WHERE contract_id = $1', [id])
  res.json({ success: true })
})

// Helper: check if targetId is a direct report of managerId
async function isDirectReport(managerId: string, targetId: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM employees WHERE employee_id = $1 AND manager_id = $2',
    [targetId, managerId]
  )
  return result.rows.length > 0
}