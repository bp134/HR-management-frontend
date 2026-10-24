import { useCallback, useEffect, useState } from 'react'
import {
  type Document,
  DOCUMENT_TYPES,
  getDocuments,
  getDocumentDownloadUrl,
  uploadDocumentApi,
  deleteDocumentApi,
  ApiError,
} from '../lib/api'

export type { Document }
export { DOCUMENT_TYPES }

export function useDocuments(employeeId?: string) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getDocuments(employeeId)
      .then(data => {
        if (!cancelled) {
          setDocuments(data.documents)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load documents')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [employeeId, tick])

  return { documents, loading, error, refresh }
}

export async function uploadDocument(
  employeeId: string,
  file: File,
  documentType: string
): Promise<{ error: string | null }> {
  try {
    await uploadDocumentApi(employeeId, file, documentType)
    return { error: null }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Upload failed' }
  }
}

export async function getDocumentUrl(documentId: string): Promise<string | null> {
  try {
    const data = await getDocumentDownloadUrl(documentId)
    return data.url
  } catch {
    return null
  }
}

export async function deleteDocument(documentId: string): Promise<{ error: string | null }> {
  try {
    await deleteDocumentApi(documentId)
    return { error: null }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Delete failed' }
  }
}