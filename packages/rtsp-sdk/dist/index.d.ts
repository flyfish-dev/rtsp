export interface RTSPConfigureOptions {
  extensionId?: string;
  tagName?: string;
  runtime?: RTSPRuntime;
}

export type RTSPRuntime = "extension" | "desktop" | "auto";
export type RTSPMediaTransport = "auto" | "webrtc" | "ws-annexb";
export type RTSPCodec = "auto" | "h264" | "h265";

export interface RTSPPlayerOptions extends RTSPConfigureOptions {
  url?: string;
  src?: string;
  width?: string | number;
  height?: string | number;
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  transport?: RTSPMediaTransport | "tcp" | string;
  rtspTransport?: "tcp" | "udp" | string;
  mediaTransport?: RTSPMediaTransport | string;
  codec?: RTSPCodec | string;
}

export declare const RTSP_PLAYER_VERSION: string;

export declare function configureRTSP(options?: RTSPConfigureOptions): {
  extensionId: string;
  tagName: string;
  runtime: RTSPRuntime;
};

export declare function defineRTSPPlayer(
  tagName?: string,
  options?: RTSPConfigureOptions,
): CustomElementConstructor | undefined;

export declare function probeRTSPCapabilities(codec?: RTSPCodec | string): Promise<{
  desktopRuntime: boolean;
  webcodecs: boolean;
  webrtc: boolean;
  h264WebRTC: boolean;
  h265WebRTC: boolean;
  h264WebCodecs: boolean;
  h265WebCodecs: boolean;
  requestedCodec: RTSPCodec;
}>;

export declare function createRTSPPlayer(options?: RTSPPlayerOptions): HTMLElement;

export declare function updateRTSPPlayer<T extends HTMLElement>(
  element: T,
  options?: RTSPPlayerOptions,
): T;
