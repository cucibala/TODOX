import { useOrgStore } from '../stores/org'
import { buildImageUrl, deleteImage as deleteRemoteImage, uploadImage } from './server_api'

const electronAPI = window.electronAPI

const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']

function isVideoFileName(fileName) {
  if (!fileName) return false
  const ext = fileName.toLowerCase().split('.').pop()
  return videoExts.includes(ext)
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => resolve(event.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function selectFileFromBrowser(accept = 'image/*,video/*') {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const file = input.files && input.files[0] ? input.files[0] : null
      resolve(file)
    }
    input.click()
  })
}

export async function selectMedia() {
  const orgStore = useOrgStore()
  if (orgStore.isServerMode) {
    if (!orgStore.hasSession) {
      return { success: false, error: '请先加入组织' }
    }
    const file = await selectFileFromBrowser()
    if (!file) return { success: false, canceled: true }
    const dataUrl = await readFileAsDataUrl(file)
    const uploadResult = await uploadImage(orgStore.serverBaseUrl, {
      orgId: orgStore.orgId,
      memberId: orgStore.memberId,
      dataUrl
    })
    return {
      success: true,
      fileName: uploadResult.fileName,
      previewSrc: dataUrl,
      isVideo: uploadResult.video
    }
  }

  const result = await electronAPI.selectImage()
  if (!result.success) return result
  const imageResult = await electronAPI.readImage(result.fileName)
  if (!imageResult.success) return { success: false }

  let previewSrc = ''
  if (imageResult.isVideo && imageResult.path) {
    previewSrc = `todox-file://${imageResult.path}`
  } else if (imageResult.data) {
    previewSrc = imageResult.data
  }

  return {
    success: true,
    fileName: result.fileName,
    previewSrc,
    isVideo: Boolean(imageResult.isVideo)
  }
}

export async function uploadMediaDataUrl(dataUrl) {
  const orgStore = useOrgStore()
  if (orgStore.isServerMode) {
    if (!orgStore.hasSession) {
      return { success: false, error: '请先加入组织' }
    }
    const uploadResult = await uploadImage(orgStore.serverBaseUrl, {
      orgId: orgStore.orgId,
      memberId: orgStore.memberId,
      dataUrl
    })
    return {
      success: true,
      fileName: uploadResult.fileName,
      previewSrc: dataUrl,
      isVideo: uploadResult.video
    }
  }

  const result = await electronAPI.saveImageFromClipboard(dataUrl)
  if (!result.success) return { success: false, error: result.error }
  return {
    success: true,
    fileName: result.fileName,
    previewSrc: dataUrl,
    isVideo: Boolean(result.isVideo)
  }
}

export async function resolveMediaSource(fileName) {
  const orgStore = useOrgStore()
  if (orgStore.isServerMode) {
    if (!orgStore.hasSession) {
      return { success: false }
    }
    return {
      success: true,
      isVideo: isVideoFileName(fileName),
      src: buildImageUrl(orgStore.serverBaseUrl, fileName, orgStore.orgId, orgStore.memberId)
    }
  }

  const result = await electronAPI.readImage(fileName)
  if (!result.success) return { success: false }

  if (result.isVideo && result.path) {
    return { success: true, isVideo: true, src: `todox-file://${result.path}` }
  }
  if (result.data) {
    return { success: true, isVideo: false, src: result.data }
  }
  return { success: false }
}

export async function removeMedia(fileName) {
  const orgStore = useOrgStore()
  if (orgStore.isServerMode) {
    if (!orgStore.hasSession) return
    await deleteRemoteImage(orgStore.serverBaseUrl, fileName, orgStore.orgId, orgStore.memberId)
    return
  }
  await electronAPI.deleteImage(fileName)
}
