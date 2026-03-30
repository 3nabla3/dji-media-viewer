declare module 'mp4box' {
  interface VideoTrackInfo {
    codec: string
    bitrate: number
    nb_samples: number
    duration: number
    timescale: number
    video: { width: number; height: number }
  }
  interface AudioTrackInfo {
    codec: string
    bitrate: number
  }
  interface MP4Info {
    duration: number
    timescale: number
    videoTracks: VideoTrackInfo[]
    audioTracks: AudioTrackInfo[]
    created?: Date
    brands?: string[]
  }
  interface MP4File {
    onReady: (info: MP4Info) => void
    onError: (e: string) => void
    appendBuffer(buffer: ArrayBuffer & { fileStart: number }): void
    flush(): void
  }
  function createFile(): MP4File
  export default { createFile }
}
