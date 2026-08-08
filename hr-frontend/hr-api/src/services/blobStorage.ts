import { BlobServiceClient } from '@azure/storage-blob'
import { Readable } from 'stream'

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
if (!connectionString) {
  throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set')
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)

export const CONTRACTS_CONTAINER = process.env.AZURE_STORAGE_CONTRACTS_CONTAINER ?? 'contracts'
export const DOCUMENTS_CONTAINER = process.env.AZURE_STORAGE_DOCUMENTS_CONTAINER ?? 'documents'

// Upload a file buffer to Azure Blob Storage
export async function uploadBlob(
  containerName: string,
  blobName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const containerClient = blobServiceClient.getContainerClient(containerName)
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  })

  return blobName
}

// Generate a short-lived signed URL (SAS) for secure download
export async function getSignedUrl(
  containerName: string,
  blobName: string,
  expirySeconds = 60
): Promise<string> {
  const containerClient = blobServiceClient.getContainerClient(containerName)
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)

  const expiresOn = new Date()
  expiresOn.setSeconds(expiresOn.getSeconds() + expirySeconds)

  const sasUrl = await blockBlobClient.generateSasUrl({
    permissions: { read: true } as any,
    expiresOn,
  })

  return sasUrl
}

// Delete a blob from storage
export async function deleteBlob(
  containerName: string,
  blobName: string
): Promise<void> {
  const containerClient = blobServiceClient.getContainerClient(containerName)
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)
  await blockBlobClient.deleteIfExists()
}