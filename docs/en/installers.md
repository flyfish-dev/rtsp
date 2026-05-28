# Installers

Online install assistant:

```txt
https://rtsp.flyfish.dev/#demo
```

The assistant checks the Chrome extension, Native Runtime, and current page authorization, then recommends the correct graphical installer for the current operating system.

Fixed Chrome extension ID:

```txt
giegomfhcmgebjhdiihnjohoinkbcjbh
```

## Downloads

```txt
https://rtsp.flyfish.dev/downloads/rtsp-macos-installer.dmg
https://rtsp.flyfish.dev/downloads/rtsp-macos-installer.zip
https://rtsp.flyfish.dev/downloads/rtsp-windows-installer.zip
https://rtsp.flyfish.dev/downloads/rtsp-linux-installer.tar.gz
```

## Installation

### macOS

1. Open `rtsp-macos-installer.dmg`.
2. Run `RTSP Installer.app`.
3. In Chrome, open `chrome://extensions` and enable Developer mode.
4. Click Load unpacked and select the extension directory shown by the installer.
5. Return to the demo and recheck.

If macOS blocks the first launch, right-click the app and choose Open.

### Windows

1. Unzip `rtsp-windows-installer.zip`.
2. Run `RTSP Installer.hta`.
3. Enable Developer mode in Chrome extensions.
4. Load the prepared extension directory.
5. Return to the demo and recheck.

### Linux

1. Extract `rtsp-linux-installer.tar.gz`.
2. Run `RTSP Installer.desktop` or `./install-gui.sh`.
3. Enable Developer mode in Chrome extensions.
4. Load the prepared extension directory.
5. Return to the demo and recheck.

## What the Installer Does

- Copies the local RTSP Runtime.
- Prepares the Chrome extension directory.
- Registers the Native Messaging Host.
- Opens the Chrome extensions page.
- Shows or copies the extension directory path.
