import { useState, useEffect, useRef } from 'react'
import { encryptData, decryptData } from '../utils/cryptoHelper'

const SECRET_KEY = import.meta.env.VITE_SOCKET_ENCRYPTION_KEY || 'default-fallback-key-32chars-for-aes';
const CHUNK_SIZE = 48 * 1024; // 48KB chunks for websocket transit

export default function FileShare({ socket, roomId, userName, files = [], setFiles }) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // { name, percent }
  const [downloadProgress, setDownloadProgress] = useState({}) // fileId -> percent
  const fileInputRef = useRef(null)

  // Track chunk assembly in memory
  // fileId -> Array(totalChunks)
  const incomingChunksRef = useRef({})

  useEffect(() => {
    if (!socket) return

    // Listen for incoming chunks from other users
    const handleReceiveChunk = async (data) => {
      const { fileId, chunkIndex, totalChunks, chunkData, fileName, fileType, fileSize, senderName } = data

      // If we don't have this file in incoming chunks yet, initialize it
      if (!incomingChunksRef.current[fileId]) {
        incomingChunksRef.current[fileId] = new Array(totalChunks)
        setDownloadProgress(prev => ({ ...prev, [fileId]: 0 }))
      }

      try {
        // Decrypt the chunk
        const decryptedChunk = await decryptData(chunkData, SECRET_KEY)
        incomingChunksRef.current[fileId][chunkIndex] = decryptedChunk

        // Calculate progress
        const filled = incomingChunksRef.current[fileId].filter(Boolean).length
        const percent = Math.round((filled / totalChunks) * 100)
        
        setDownloadProgress(prev => ({ ...prev, [fileId]: percent }))

        // If complete, assemble and add to files list
        if (filled === totalChunks) {
          const fullBase64 = incomingChunksRef.current[fileId].join('')
          
          setFiles(prev => {
            if (prev.some(f => f.fileId === fileId)) return prev;
            return [
              ...prev,
              {
                fileId,
                fileName,
                fileType,
                fileSize,
                senderName,
                isComplete: true,
                dataUrl: fullBase64
              }
            ]
          })

          // Clean up progress indicator
          setDownloadProgress(prev => {
            const next = { ...prev }
            delete next[fileId]
            return next
          })
          delete incomingChunksRef.current[fileId]
        }
      } catch (err) {
        console.error('Failed to decrypt incoming file chunk:', err)
      }
    }

    // Listen for file-complete signal from backend
    const handleFileComplete = (data) => {
      const { fileId, fileName, fileType, fileSize, senderName } = data
      
      setFiles(prev => {
        // Find if file is already in list
        const index = prev.findIndex(f => f.fileId === fileId)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = { ...updated[index], isComplete: true }
          return updated
        } else {
          return [
            ...prev,
            {
              fileId,
              fileName,
              fileType,
              fileSize,
              senderName,
              isComplete: true
            }
          ]
        }
      })
    }

    // Listen for chunks requested during direct download
    const handleDownloadChunk = async (data) => {
      const { fileId, chunkIndex, totalChunks, chunkData } = data
      
      if (!incomingChunksRef.current[fileId]) {
        incomingChunksRef.current[fileId] = new Array(totalChunks)
        setDownloadProgress(prev => ({ ...prev, [fileId]: 0 }))
      }

      try {
        const decryptedChunk = await decryptData(chunkData, SECRET_KEY)
        incomingChunksRef.current[fileId][chunkIndex] = decryptedChunk

        const filled = incomingChunksRef.current[fileId].filter(Boolean).length
        const percent = Math.round((filled / totalChunks) * 100)
        setDownloadProgress(prev => ({ ...prev, [fileId]: percent }))

        if (filled === totalChunks) {
          const fullBase64 = incomingChunksRef.current[fileId].join('')
          
          // Trigger the download automatically
          const link = document.createElement('a')
          link.href = fullBase64
          const targetFile = files.find(f => f.fileId === fileId)
          link.download = targetFile ? targetFile.fileName : 'downloaded_file'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          // Clean up progress
          setDownloadProgress(prev => {
            const next = { ...prev }
            delete next[fileId]
            return next
          })
          delete incomingChunksRef.current[fileId]
        }
      } catch (err) {
        console.error('Download chunk decryption failed:', err)
      }
    }

    // Listen for full file list sync on join
    const handleFileList = (fileList) => {
      setFiles(prev => {
        // Merge lists, keeping local data urls if already present
        const merged = [...prev]
        fileList.forEach(newFile => {
          if (!merged.some(f => f.fileId === newFile.fileId)) {
            merged.push(newFile)
          }
        })
        return merged
      })
    }

    socket.on('receive-file-chunk', handleReceiveChunk)
    socket.on('file-complete', handleFileComplete)
    socket.on('download-file-chunk', handleDownloadChunk)
    socket.on('file-list', handleFileList)

    return () => {
      socket.off('receive-file-chunk', handleReceiveChunk)
      socket.off('file-complete', handleFileComplete)
      socket.off('download-file-chunk', handleDownloadChunk)
      socket.off('file-list', handleFileList)
    }
  }, [socket, setFiles, files])

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0])
    }
  }

  const handleUploadFile = async (file) => {
    if (!socket || !roomId) return

    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setUploadProgress({ name: file.name, percent: 0 })

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64String = event.target.result
      const totalChunks = Math.ceil(base64String.length / CHUNK_SIZE)

      // Add to our local files list immediately as completed
      setFiles(prev => [
        ...prev,
        {
          fileId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          senderName: 'You',
          isComplete: true,
          dataUrl: base64String
        }
      ])

      // Stream chunks sequentially
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, base64String.length)
        const chunk = base64String.slice(start, end)
        
        try {
          // Encrypt before transport
          const encryptedChunk = await encryptData(chunk, SECRET_KEY)
          
          socket.emit('file-share-chunk', {
            roomId,
            fileId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            chunkIndex: i,
            totalChunks,
            chunkData: encryptedChunk,
            senderName: userName || 'You'
          })

          const progressPercent = Math.round(((i + 1) / totalChunks) * 100)
          setUploadProgress({ name: file.name, percent: progressPercent })
        } catch (err) {
          console.error('Failed to encrypt and upload chunk:', err)
          break
        }
      }

      // Reset upload progress display after brief delay
      setTimeout(() => setUploadProgress(null), 1000)
    }
    
    reader.readAsDataURL(file)
  }

  const handleDownload = (file) => {
    if (file.dataUrl) {
      // If we already have the data URL locally, download it directly
      const link = document.createElement('a')
      link.href = file.dataUrl
      link.download = file.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else if (socket) {
      // Otherwise, request chunks from the server cache
      socket.emit('request-file-download', { fileId: file.fileId })
    }
  }

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/40 rounded-2xl border border-slate-800/80 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          Secure File Sharing
        </h3>
        <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded uppercase">AES-256 Encrypted</span>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 select-none min-h-[120px] ${
          dragActive 
            ? 'border-indigo-500 bg-indigo-500/5' 
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/20 hover:bg-slate-950/40'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
        </svg>

        <span className="text-xs text-slate-300 font-semibold">
          Drag & drop file or <span className="text-indigo-400 hover:underline">browse</span>
        </span>
        <span className="text-[10px] text-slate-500">
          Supports documents, images, and archives up to 10MB
        </span>
      </div>

      {/* Uploading Progress Indicator */}
      {uploadProgress && (
        <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 space-y-2">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400 truncate max-w-[70%] font-medium">Uploading: {uploadProgress.name}</span>
            <span className="text-indigo-400 font-bold font-mono">{uploadProgress.percent}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-350" style={{ width: `${uploadProgress.percent}%` }}></div>
          </div>
        </div>
      )}

      {/* Shared History List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[300px] pr-1">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none mb-1">Shared History</h4>
        
        {files.length === 0 ? (
          <div className="text-center py-6 text-slate-600 text-[11px] border border-dashed border-slate-850 rounded-xl select-none">
            No files shared in this meeting yet.
          </div>
        ) : (
          files.map(file => {
            const isDownloading = downloadProgress[file.fileId] !== undefined
            const downloadPercent = downloadProgress[file.fileId] || 0

            return (
              <div key={file.fileId} className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/20 hover:bg-slate-950/40 transition-all">
                <div className="flex items-center gap-3 overflow-hidden mr-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-center text-xs font-bold text-slate-400 select-none flex-shrink-0">
                    {file.fileName.split('.').pop().toUpperCase().slice(0, 3)}
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-xs font-semibold text-slate-200 truncate block">{file.fileName}</span>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono mt-0.5">
                      <span>{formatBytes(file.fileSize)}</span>
                      <span>•</span>
                      <span className="text-slate-400">By {file.senderName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isDownloading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg border border-slate-800 flex items-center justify-center text-[10px] text-indigo-400 font-bold font-mono">
                        {downloadPercent}%
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 active:scale-95 transition-all shadow-md"
                      title="Download File"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
