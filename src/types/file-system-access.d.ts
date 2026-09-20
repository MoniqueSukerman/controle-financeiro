type FileSystemPermissionMode = 'read' | 'readwrite'

interface FileSystemHandlePermissionDescriptor {
  mode?: FileSystemPermissionMode
}

interface FileSystemHandle {
  readonly kind: 'file' | 'directory'
  readonly name: string
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>
  close(): Promise<void>
}

interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file'
  getFile(): Promise<File>
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory'
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
}

interface DirectoryPickerOptions {
  id?: string
  mode?: FileSystemPermissionMode
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
}
