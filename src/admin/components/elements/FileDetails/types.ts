export type Props = {
  filename: string,
  mimeType: string,
  filesize: number,
  staticURL: string,
  width?: number,
  height?: number,
  sizes?: unknown,
  adminThumbnail?: string,
  handleRemove?: () => void,
}