# 部署发布

## 私有源码仓库

源码仓库位于：

```txt
flyfish-dev/rtsp-source
```

源码仓库保持私有，用于持续开发、构建和验证。

## 公开产物仓库

公开仓库位于：

```txt
flyfish-dev/rtsp
```

公开仓库只放完整构建产物、安装包、文档站静态文件和 README。每次公开更新都必须创建 GitHub Release。

推荐命令：

```bash
npm run release:public
```

脚本会：

1. 重新生成公开工作区。
2. 推送构建产物到 `flyfish-dev/rtsp`。
3. 创建时间戳 tag。
4. 上传 macOS / Windows / Linux 安装包。

## Vercel 文档站

站点目录：

```txt
site/
```

本地构建：

```bash
npm run build:site
```

生产部署使用 Vercel Build Output API，避免旧项目配置干扰：

```bash
npm run build:site
rm -rf /tmp/rtsp-vercel-prebuilt
mkdir -p /tmp/rtsp-vercel-prebuilt/.vercel/output/static
rsync -a site/dist/ /tmp/rtsp-vercel-prebuilt/.vercel/output/static/
printf '{"version":3}\n' > /tmp/rtsp-vercel-prebuilt/.vercel/output/config.json
vercel deploy /tmp/rtsp-vercel-prebuilt --prebuilt --prod --yes --project rtsp
```

正式域名：

```txt
https://rtsp.flyfish.dev
```

兼容旧 Demo 域名：

```txt
https://rtsp-roan.vercel.app
```

不要把 `doc.flyfish.dev` 绑定到本项目。

## 发布前检查

```bash
npm run check
```

```bash
for target in darwin/arm64 darwin/amd64 linux/amd64 linux/arm64 windows/amd64; do
  GOOS="${target%/*}" GOARCH="${target#*/}" CGO_ENABLED=0 ./scripts/build.sh
done
```

```bash
npm run build:desktop
npm run build:installers
npm run build:site
```

## 线上校验

```bash
curl -I https://rtsp.flyfish.dev/
curl -I https://rtsp.flyfish.dev/downloads/rtsp-macos-installer.dmg
gh release view <tag> -R flyfish-dev/rtsp
```
