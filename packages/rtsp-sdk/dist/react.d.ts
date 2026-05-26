import type { CSSProperties, ForwardRefExoticComponent, RefAttributes } from "react";

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
  className?: string;
  style?: CSSProperties;
  onReady?: (event: CustomEvent) => void;
  onError?: (event: CustomEvent) => void;
  onStarting?: (event: CustomEvent) => void;
}

export declare const RtspPlayer: ForwardRefExoticComponent<
  RtspPlayerProps & RefAttributes<HTMLElement>
>;

export default RtspPlayer;
