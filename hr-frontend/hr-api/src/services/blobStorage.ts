import { BlobServiceClient } from '@azure/storage-blob'

export const CONTRACTS_CONTAINER = process.env.AZURE_STORAGE_CONTRACTS_CONTAINER ?? 'contracts'
export const DOCUMENTS_CONTAINER = process.env.AZURE_STORAGE_DOCUMENTS_CONTAINER ?? 'documents'

function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING ?? ''
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set')
  }
  return BlobServiceClient.fromConnectionString(connectionString)
}

export async function uploadBlob(
  containerName: string,
  blobName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getBlobServiceClient().getContainerClient(containerName)
  const blockBlobClient = client.getBlockBlobClient(blobName)
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  })
  return blobName
}

export async function getSignedUrl(
  containerName: string,
  blobName: string,
  expirySeconds = 60
): Promise<string> {
  const client = getBlobServiceClient().getContainerClient(containerName)
  const blockBlobClient = client.getBlockBlobClient(blobName)
  const expiresOn = new Date()
  expiresOn.setSeconds(expiresOn.getSeconds() + expirySeconds)
  const sasUrl = await blockBlobClient.generateSasUrl({
    permissions: { read: true } as any,
    expiresOn,
  })
  return sasUrl
}

export async function deleteBlob(
  containerName: string,
  blobName: string
): Promise<void> {
  const client = getBlobServiceClient().getContainerClient(containerName)
  const blockBlobClient = client.getBlockBlobClient(blobName)
  await blockBlobClient.deleteIfExists()
}