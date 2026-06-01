import type { DefineComponent } from "vue";

export interface RtspPlayerProps {
  extensionId?: string;
  url?: string;
  src?: string;
  width?: string | number;
  height?: string | number;
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  transport?: "auto" | "webrtc" | "ws-annexb" | "tcp" | string;
  rtspTransport?: "tcp" | "udp" | string;
  mediaTransport?: "auto" | "webrtc" | "ws-annexb" | string;
  codec?: "auto" | "h264" | "h265" | string;
  runtime?: "extension" | "desktop" | "auto";
  tagName?: string;
}

export declare const RtspPlayer: DefineComponent<RtspPlayerProps>;

export default RtspPlayer;
