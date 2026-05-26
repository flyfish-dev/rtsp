# 一键安装器

在线安装助手：

```txt
https://rtsp-roan.vercel.app/#demo
```

安装助手会检测 Chrome 扩展、Native Runtime 和当前站点授权状态，并推荐当前系统的图形安装器。

固定 Chrome 扩展 ID：

```txt
giegomfhcmgebjhdiihnjohoinkbcjbh
```

## 下载

```txt
https://rtsp-roan.vercel.app/downloads/rtsp-macos-installer.dmg
https://rtsp-roan.vercel.app/downloads/rtsp-macos-installer.zip
https://rtsp-roan.vercel.app/downloads/rtsp-windows-installer.zip
https://rtsp-roan.vercel.app/downloads/rtsp-linux-installer.tar.gz
```

## 安装流程

### macOS

1. 打开 `rtsp-macos-installer.dmg`。
2. 双击 `RTSP Installer.app`。
3. 安装完成后，在 Chrome 扩展页开启 Developer mode。
4. 点击 Load unpacked，选择安装器打开的 extension 目录。
5. 回到在线 Demo，点击重新检测。

如果系统拦截首次启动，请右键 `RTSP Installer.app`，选择打开。

### Windows

1. 解压 `rtsp-windows-installer.zip`。
2. 打开 `RTSP Installer.hta`。
3. 安装完成后，在 Chrome 扩展页开启 Developer mode。
4. 点击 Load unpacked，选择安装器准备好的 extension 目录。
5. 回到在线 Demo，点击重新检测。

如果 Windows 阻止 HTA 文件，请运行 `install.bat` 作为备用入口。

### Linux

1. 解压 `rtsp-linux-installer.tar.gz`。
2. 打开 `RTSP Installer.desktop`，或运行 `./install-gui.sh`。
3. 安装完成后，在 Chrome 扩展页开启 Developer mode。
4. 点击 Load unpacked，选择安装器准备好的 extension 目录。
5. 回到在线 Demo，点击重新检测。

如果桌面环境阻止 launcher 文件，请运行 `./install.sh` 作为备用入口。

## 安装器会做什么

- 复制本地 RTSP Runtime。
- 准备 Chrome 扩展目录。
- 注册 Native Messaging Host。
- 打开 Chrome 扩展页。
- 将 extension 目录复制到剪贴板，或显示在完成提示中。

Chrome 仍要求用户点击 Load unpacked，这是浏览器安全限制。

## 企业分发

企业环境可以通过 Chrome Enterprise policy 预装扩展，并提前写入 Native Messaging Host manifest。这样终端用户打开页面时会直接进入“已就绪”状态。
